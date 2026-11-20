Before anything is deployed, the code must be packaged with its dependencies, built into an artifact or a container image, stored in a repository, and given the configuration of the environment it lands in. Questions describe a build that fails, an image that changed under the same tag, a function that needs a library or a private package, or one code base that must read different settings in dev and prod. This chapter covers dependencies, container images with Amazon ECR, code repositories, environment-specific configuration, and API Gateway stages and endpoints.

<!-- section: package-dependencies | objectives: 3.1.1 -->
## Managing dependencies in packages

| Artifact | Where dependencies go |
| --- | --- |
| Lambda .zip package | In the archive next to the handler (`pip install -r requirements.txt -t package/`, `npm ci --omit=dev`); 50 MB zipped for a direct upload (larger through S3), 250 MB unzipped including layers |
| Lambda layer | Shared libraries or a custom runtime, extracted to `/opt` (`/opt/python`, `/opt/nodejs/node_modules`); up to 5 layers per function; versioned, referenced by version ARN |
| Lambda container image | Installed in the image; up to 10 GB uncompressed |
| Container for ECS or EKS | Installed at build time in the Dockerfile, pinned by lock file |
| Elastic Beanstalk | `requirements.txt`, `package.json` or `pom.xml` in the source bundle; options in `.ebextensions/*.config`; environment properties for settings |
| AWS SAM | `sam build` resolves each function's manifest and builds in a container that matches the runtime (`--use-container`) when native libraries are involved |

Libraries with native code must be built for the target: Amazon Linux and the function's architecture (`x86_64` or `arm64`).

**Private packages** come from **AWS CodeArtifact**: a domain holds repositories; a repository can have upstream repositories and one external connection to a public registry (npmjs, PyPI, Maven Central, NuGet Gallery), which fetches and caches public packages on demand. Packages are never public.

```bash
aws codeartifact login --tool pip --domain anycompany \
  --domain-owner 111122223333 --repository shared-libs
```

The command gets an authorization token (12 hours by default and at most) and configures pip, npm or twine. The caller needs `codeartifact:GetAuthorizationToken` and `sts:GetServiceBearerToken`; in CodeBuild, run it in the `pre_build` phase with the service role.

**Configuration** stays out of the package when it differs by environment: Lambda environment variables (4 KB in total per function, encrypted at rest, not for secrets), Parameter Store, AppConfig. Configuration files bundled in the package are fine for values that are the same everywhere.

> **Exam trap.** "Several functions share the same 30 MB library and every deployment uploads it again" is a Lambda layer. A layer doesn't raise the 250 MB unzipped limit: beyond it, use a container image.

<!-- section: container-images | objectives: 3.1.2 -->
## Building and managing container images

A Dockerfile builds the image; a multi-stage build keeps compilers out of the final image (shown as text):

```text
FROM public.ecr.aws/docker/library/node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

Push it to a private **Amazon ECR** repository. The registry URI is `aws_account_id.dkr.ecr.region.amazonaws.com`; the login token is valid 12 hours.

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS \
  --password-stdin 111122223333.dkr.ecr.eu-west-1.amazonaws.com
docker build -t orders-api:3f9c2a1 .
docker tag orders-api:3f9c2a1 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:3f9c2a1
docker push 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders-api:3f9c2a1
```

The pushing role needs `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload` and `ecr:PutImage`.

| Requirement | ECR feature |
| --- | --- |
| A tag must always point to the same image | Tag immutability `IMMUTABLE`: pushing an existing tag fails with `ImageTagAlreadyExistsException`; `IMMUTABLE_WITH_EXCLUSION` keeps chosen tags (such as `latest`) mutable |
| Traceable releases | Tag with the commit SHA or a version; deploy by tag or by digest (`@sha256:...`), never by `latest` |
| Delete old or untagged images automatically | Lifecycle policy (applied within 24 hours; preview first) |
| Find vulnerabilities | Basic scanning (OS packages, on push or manual) or enhanced scanning with Amazon Inspector (OS and language packages, continuous, events to EventBridge) |
| Images for Graviton and x86 | Multi-architecture image (manifest list) built with `docker buildx --platform linux/amd64,linux/arm64` |
| Use images from Docker Hub or ECR Public through ECR | Pull through cache rules |
| Same images in another Region or account | Replication rules |

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Expire untagged images after 7 days",
      "selection": { "tagStatus": "untagged", "countType": "sinceImagePushed", "countUnit": "days", "countNumber": 7 },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Keep the last 20 release images",
      "selection": { "tagStatus": "tagged", "tagPrefixList": ["release-"], "countType": "imageCountMoreThan", "countNumber": 20 },
      "action": { "type": "expire" }
    }
  ]
}
```

A Lambda function deployed as a container image pulls it from ECR; AWS base images include the runtime interface client, and other base images must add it.

> **Exam trap.** "Production picked up an untested image after someone pushed to the same tag" is fixed by immutable tags and unique tags per build (or deploying by digest), not by a lifecycle policy. Lifecycle rules only delete or archive images.

<!-- section: code-repositories | objectives: 3.1.3 -->
## Using code repositories in deployment environments

| Repository | How AWS services reach it |
| --- | --- |
| AWS CodeCommit (open to new customers again since November 25, 2025) | IAM: HTTPS Git credentials, or `git-remote-codecommit` with the credential chain and roles; native source for CodePipeline and CodeBuild |
| GitHub, GitHub Enterprise Server, GitLab, GitLab self-managed, Bitbucket | AWS CodeConnections (formerly CodeStar Connections): a connection resource, referenced by ARN in CodePipeline, CodeBuild and CloudFormation, with no stored token |
| Any Git provider, for front-end apps | AWS Amplify Hosting connects a branch; each connected branch gets its own build and URL |

A connection created by the CLI or CloudFormation stays in `PENDING` status until someone completes the authorization handshake in the console; pipelines that use it fail until it is `AVAILABLE`. Resources created under the old `codestar-connections` namespace keep working.

How changes start a deployment:

| Requirement | Configuration |
| --- | --- |
| Run the pipeline on each push to `main` | CodePipeline source action on the branch (V2 pipelines add triggers with branch, file path and tag filters) |
| Run only when a release tag is pushed | V2 pipeline trigger filtered on Git tags |
| Build every pull request | CodeBuild webhook with event filters (`PULL_REQUEST_CREATED`, `PULL_REQUEST_UPDATED`) |
| Need the full Git history in the build (tags, `git describe`) | Source action set to full clone instead of the default zip of the latest commit |

Keep secrets out of repositories: `.gitignore` local credential files, read secrets at build or run time from Secrets Manager or Parameter Store, and scan commits for keys.

> **Exam trap.** "The pipeline with a new GitHub connection fails at the source stage" usually means the connection is still `PENDING`. Updating the connection in the console fixes it; creating a personal access token in a secret is the legacy approach.

<!-- section: environment-config | objectives: 3.1.4 -->
## Environment-specific configuration

| Requirement | Service |
| --- | --- |
| Change application behavior without redeploying, with validation, gradual rollout and automatic rollback | AWS AppConfig |
| Plain or encrypted settings per environment in a hierarchy (`/orders/prod/db-host`) | Systems Manager Parameter Store; read a whole environment with `GetParametersByPath` |
| Credentials that rotate | Secrets Manager |
| Different Lambda function, URL or setting per API stage | API Gateway stage variables |
| Per-version settings for a function | Lambda environment variables, frozen in each published version; aliases (`dev`, `prod`) point to versions |
| Values at build time | CodeBuild buildspec `env` (`variables`, `parameter-store`, `secrets-manager`) |
| Values at deployment time | CloudFormation parameters, mappings and dynamic references; `samconfig.toml` environments with `sam deploy --config-env prod` |

**AppConfig** organizes an application into environments and configuration profiles (feature flags or free-form data from the hosted store, S3, Parameter Store, Secrets Manager or CodePipeline). A deployment validates the data (JSON Schema or a Lambda validator), then follows a deployment strategy (`AppConfig.AllAtOnce`, `AppConfig.Linear50PercentEvery30Seconds`, `AppConfig.Canary10Percent20Minutes` or your own) with a bake time; a CloudWatch alarm on the environment triggers automatic rollback. Applications read it through the AppConfig Agent or its Lambda extension (`http://localhost:2772/applications/.../environments/.../configurations/...`, cached and polled every 45 seconds by default), or with `StartConfigurationSession` and `GetLatestConfiguration`; `GetConfiguration` is the legacy API.

```yaml
version: 0.2
env:
  variables:
    STAGE: prod
  parameter-store:
    DB_HOST: /orders/prod/db-host
  secrets-manager:
    DB_PASSWORD: prod/orders/db:password
phases:
  build:
    commands:
      - ./scripts/build.sh "$STAGE"
```

> **Exam trap.** Lambda environment variables can't differ between aliases of the same version: they are part of the version. To give `dev` and `prod` different values from one artifact, publish versions with different variables, or read Parameter Store or AppConfig paths named after the alias or stage.

<!-- section: api-gateway-stages | objectives: 3.1.5 -->
## API Gateway stages, URLs and endpoints

A **REST API** change reaches clients only after a deployment to a stage; each stage has its own URL, `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`, and its own settings: throttling, caching, logging and tracing, stage variables, and canary settings that send a percentage of traffic to a new deployment. An **HTTP API** can use the `$default` stage with automatic deployment, served at the root URL.

| Endpoint type | Use |
| --- | --- |
| Edge-optimized (default for REST APIs) | Clients spread worldwide, through CloudFront points of presence; custom domain certificate in us-east-1 |
| Regional | Clients in the same Region, or your own CloudFront distribution in front; certificate in the API's Region |
| Private | Only from VPCs through an interface endpoint for `execute-api`; requires a resource policy that allows the endpoint or VPC |

HTTP APIs are Regional only. A **custom domain name** (`api.example.com`) with an ACM certificate maps base paths to APIs and stages (`/v1` to the `prod` stage), needs a DNS record pointing to the domain's target name, and lets you disable the default `execute-api` endpoint (callers then get 403).

Stage variables point each stage at a Lambda alias:

```bash
# Integration URI: arn:aws:lambda:eu-west-1:111122223333:function:orders:${stageVariables.lambdaAlias}
aws apigateway update-stage --rest-api-id a1b2c3d4e5 --stage-name prod \
  --patch-operations op=replace,path=/variables/lambdaAlias,value=prod
aws lambda add-permission --function-name "orders:prod" \
  --statement-id apigw-prod --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-1:111122223333:a1b2c3d4e5/*/GET/orders"
```

Stage variables can't switch the integration type and must not hold secrets.

> **Exam trap.** "The change works in the console test but clients still get the old behavior" on a REST API means it wasn't deployed to the stage. And a stage variable that names a new alias returns 500 until API Gateway has `lambda:InvokeFunction` permission on that alias.

<!-- section: key-points -->
## Key points

- Lambda .zip: 50 MB zipped direct, 250 MB unzipped with layers; up to 5 layers in `/opt`; container images up to 10 GB; build native libraries for Amazon Linux and the right architecture.
- CodeArtifact: domains, repositories, upstreams, one external connection; `aws codeartifact login`, token 12 hours.
- ECR: login token 12 hours; immutable tags and commit-SHA tags; lifecycle policies expire untagged or old images within 24 hours; basic or enhanced (Inspector) scanning.
- CodeCommit is open again; GitHub, GitLab and Bitbucket through CodeConnections, which must leave `PENDING`; V2 pipeline triggers filter branches, paths and tags.
- AppConfig: validators, deployment strategies, bake time, alarm rollback, agent on port 2772; Parameter Store hierarchies with `GetParametersByPath`; Secrets Manager for rotating credentials.
- Lambda environment variables belong to a version, not an alias; buildspec `env` reads Parameter Store and Secrets Manager.
- REST APIs need a deployment per stage; stage URLs end with the stage name; HTTP APIs offer `$default` with auto-deploy.
- Edge-optimized (default), Regional, private (VPC endpoint plus resource policy); custom domains with base path mappings; stage variables plus a permission per Lambda alias.
