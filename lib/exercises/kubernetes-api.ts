/**
 * The API of a Kubernetes v1.37 cluster, as kubectl needs it offline and as
 * the content checks need it (docs/SPECS-KUBERNETES-PRATIQUE.md §3.4, §6).
 *
 * - `RESOURCES`: the built-in resources served by the API server. kubectl
 *   reads them from a discovery cache written next to each run (no server is
 *   ever reached): `kubectl run`, `create role`, `expose -f`, `label --local`…
 *   map kinds and resource names with it.
 * - `SERVED`: apiVersion → kinds a manifest may use (the API resources above,
 *   the Gateway API CRDs installed on the exam clusters, and the configuration
 *   files read by kubeadm, the kubelet, the API server and Kustomize).
 */

interface Resource {
  /** Plural name (`deployments`), subresources included (`deployments/scale`). */
  name: string;
  kind: string;
  namespaced: boolean;
  shortNames?: string[];
  subresources?: string[];
}

const ns = (name: string, kind: string, shortNames?: string[], subresources?: string[]): Resource => ({ name, kind, namespaced: true, shortNames, subresources });
const cluster = (name: string, kind: string, shortNames?: string[], subresources?: string[]): Resource => ({ name, kind, namespaced: false, shortNames, subresources });

/** groupVersion → resources (built-in API of Kubernetes v1.37). */
export const RESOURCES: Record<string, Resource[]> = {
  v1: [
    ns("bindings", "Binding"),
    cluster("componentstatuses", "ComponentStatus", ["cs"]),
    ns("configmaps", "ConfigMap", ["cm"]),
    ns("endpoints", "Endpoints", ["ep"]),
    ns("events", "Event", ["ev"]),
    ns("limitranges", "LimitRange", ["limits"]),
    cluster("namespaces", "Namespace", ["ns"], ["finalize", "status"]),
    cluster("nodes", "Node", ["no"], ["proxy", "status"]),
    ns("persistentvolumeclaims", "PersistentVolumeClaim", ["pvc"], ["status"]),
    cluster("persistentvolumes", "PersistentVolume", ["pv"], ["status"]),
    ns("pods", "Pod", ["po"], ["attach", "binding", "ephemeralcontainers", "eviction", "exec", "log", "portforward", "proxy", "resize", "status"]),
    ns("podtemplates", "PodTemplate"),
    ns("replicationcontrollers", "ReplicationController", ["rc"], ["scale", "status"]),
    ns("resourcequotas", "ResourceQuota", ["quota"], ["status"]),
    ns("secrets", "Secret"),
    ns("serviceaccounts", "ServiceAccount", ["sa"], ["token"]),
    ns("services", "Service", ["svc"], ["proxy", "status"]),
  ],
  "admissionregistration.k8s.io/v1": [
    cluster("mutatingadmissionpolicies", "MutatingAdmissionPolicy", undefined, ["status"]),
    cluster("mutatingadmissionpolicybindings", "MutatingAdmissionPolicyBinding"),
    cluster("mutatingwebhookconfigurations", "MutatingWebhookConfiguration"),
    cluster("validatingadmissionpolicies", "ValidatingAdmissionPolicy", undefined, ["status"]),
    cluster("validatingadmissionpolicybindings", "ValidatingAdmissionPolicyBinding"),
    cluster("validatingwebhookconfigurations", "ValidatingWebhookConfiguration"),
  ],
  "apiextensions.k8s.io/v1": [cluster("customresourcedefinitions", "CustomResourceDefinition", ["crd", "crds"], ["status"])],
  "apiregistration.k8s.io/v1": [cluster("apiservices", "APIService", undefined, ["status"])],
  "apps/v1": [
    ns("controllerrevisions", "ControllerRevision"),
    ns("daemonsets", "DaemonSet", ["ds"], ["status"]),
    ns("deployments", "Deployment", ["deploy"], ["scale", "status"]),
    ns("replicasets", "ReplicaSet", ["rs"], ["scale", "status"]),
    ns("statefulsets", "StatefulSet", ["sts"], ["scale", "status"]),
  ],
  "authentication.k8s.io/v1": [cluster("selfsubjectreviews", "SelfSubjectReview"), cluster("tokenreviews", "TokenReview")],
  "authorization.k8s.io/v1": [
    ns("localsubjectaccessreviews", "LocalSubjectAccessReview"),
    cluster("selfsubjectaccessreviews", "SelfSubjectAccessReview"),
    cluster("selfsubjectrulesreviews", "SelfSubjectRulesReview"),
    cluster("subjectaccessreviews", "SubjectAccessReview"),
  ],
  "autoscaling/v2": [ns("horizontalpodautoscalers", "HorizontalPodAutoscaler", ["hpa"], ["status"])],
  "autoscaling/v1": [ns("horizontalpodautoscalers", "HorizontalPodAutoscaler", ["hpa"], ["status"])],
  "batch/v1": [ns("cronjobs", "CronJob", ["cj"], ["status"]), ns("jobs", "Job", undefined, ["status"])],
  "certificates.k8s.io/v1": [cluster("certificatesigningrequests", "CertificateSigningRequest", ["csr"], ["approval", "status"])],
  "coordination.k8s.io/v1": [ns("leases", "Lease")],
  "discovery.k8s.io/v1": [ns("endpointslices", "EndpointSlice")],
  "events.k8s.io/v1": [ns("events", "Event", ["ev"])],
  "flowcontrol.apiserver.k8s.io/v1": [
    cluster("flowschemas", "FlowSchema", undefined, ["status"]),
    cluster("prioritylevelconfigurations", "PriorityLevelConfiguration", undefined, ["status"]),
  ],
  "networking.k8s.io/v1": [
    cluster("ingressclasses", "IngressClass"),
    ns("ingresses", "Ingress", ["ing"], ["status"]),
    cluster("ipaddresses", "IPAddress", ["ip"]),
    ns("networkpolicies", "NetworkPolicy", ["netpol"]),
    cluster("servicecidrs", "ServiceCIDR", undefined, ["status"]),
  ],
  "node.k8s.io/v1": [cluster("runtimeclasses", "RuntimeClass")],
  "policy/v1": [ns("poddisruptionbudgets", "PodDisruptionBudget", ["pdb"], ["status"])],
  "rbac.authorization.k8s.io/v1": [
    cluster("clusterrolebindings", "ClusterRoleBinding"),
    cluster("clusterroles", "ClusterRole"),
    ns("rolebindings", "RoleBinding"),
    ns("roles", "Role"),
  ],
  "resource.k8s.io/v1": [
    cluster("deviceclasses", "DeviceClass"),
    ns("resourceclaims", "ResourceClaim", undefined, ["status"]),
    ns("resourceclaimtemplates", "ResourceClaimTemplate"),
    cluster("resourceslices", "ResourceSlice"),
  ],
  "scheduling.k8s.io/v1": [cluster("priorityclasses", "PriorityClass", ["pc"])],
  "storage.k8s.io/v1": [
    cluster("csidrivers", "CSIDriver"),
    cluster("csinodes", "CSINode"),
    ns("csistoragecapacities", "CSIStorageCapacity"),
    cluster("storageclasses", "StorageClass", ["sc"]),
    cluster("volumeattachments", "VolumeAttachment", undefined, ["status"]),
    cluster("volumeattributesclasses", "VolumeAttributesClass", ["vac"]),
  ],
  // Gateway API: CRDs, installed on the exam clusters (CKA "Ingress and Gateway API").
  "gateway.networking.k8s.io/v1": [
    ns("backendtlspolicies", "BackendTLSPolicy", ["btlspolicy"], ["status"]),
    cluster("gatewayclasses", "GatewayClass", ["gc"], ["status"]),
    ns("gateways", "Gateway", ["gtw"], ["status"]),
    ns("grpcroutes", "GRPCRoute", undefined, ["status"]),
    ns("httproutes", "HTTPRoute", undefined, ["status"]),
    ns("listenersets", "ListenerSet", ["lset"], ["status"]),
    ns("referencegrants", "ReferenceGrant", ["refgrant"]),
    ns("tlsroutes", "TLSRoute", undefined, ["status"]),
  ],
};

/** Configuration files that are not API resources (kubeadm, kubelet, API server, Kustomize). */
const CONFIG_KINDS: Record<string, string[]> = {
  "kubeadm.k8s.io/v1beta4": ["InitConfiguration", "ClusterConfiguration", "JoinConfiguration", "ResetConfiguration", "UpgradeConfiguration"],
  "kubelet.config.k8s.io/v1beta1": ["KubeletConfiguration", "CredentialProviderConfig"],
  "apiserver.config.k8s.io/v1": ["EncryptionConfiguration", "AdmissionConfiguration", "AuthenticationConfiguration", "AuthorizationConfiguration"],
  "audit.k8s.io/v1": ["Policy"],
  "kustomize.config.k8s.io/v1beta1": ["Kustomization"],
  "kustomize.config.k8s.io/v1alpha1": ["Component"],
};

/** Kinds that are written but never created through the API (Eviction is a subresource body). */
const BODY_KINDS: Record<string, string[]> = { "policy/v1": ["Eviction"] };

/** apiVersion → kinds a manifest may use on a Kubernetes v1.37 cluster. */
export const SERVED: Record<string, string[]> = (() => {
  const out: Record<string, Set<string>> = {};
  const add = (api: string, kinds: string[]) => {
    out[api] ??= new Set();
    for (const k of kinds) out[api].add(k);
  };
  for (const [api, list] of Object.entries(RESOURCES)) add(api, list.map((r) => r.kind));
  for (const [api, kinds] of Object.entries({ ...CONFIG_KINDS, ...BODY_KINDS })) add(api, kinds);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
})();

/** apiVersions removed from Kubernetes before v1.37. */
export const REMOVED_API_VERSIONS = new Set([
  "extensions/v1beta1",
  "apps/v1beta1",
  "apps/v1beta2",
  "batch/v1beta1",
  "policy/v1beta1",
  "networking.k8s.io/v1beta1",
  "rbac.authorization.k8s.io/v1beta1",
  "autoscaling/v2beta1",
  "autoscaling/v2beta2",
  "storage.k8s.io/v1beta1",
  "flowcontrol.apiserver.k8s.io/v1beta3",
]);

/** Kinds without metadata.name (configuration files). */
export const NAMELESS_KINDS = new Set(Object.values(CONFIG_KINDS).flat());

/** Cluster-scoped kinds (no namespace). */
export const CLUSTER_KINDS = new Set(Object.values(RESOURCES).flatMap((list) => list.filter((r) => !r.namespaced).map((r) => r.kind)));

const VERBS = ["create", "delete", "deletecollection", "get", "list", "patch", "update", "watch"];

/**
 * The discovery cache kubectl reads instead of asking a server:
 * `<cache-dir>/discovery/<host>/servergroups.json` and
 * `<group>/<version>/serverresources.json`. Returns relative path → content.
 */
export function discoveryCache(): Record<string, string> {
  const groups = new Map<string, string[]>();
  for (const gv of Object.keys(RESOURCES)) {
    const [group, version] = gv.includes("/") ? gv.split("/") : ["", gv];
    groups.set(group!, [...(groups.get(group!) ?? []), version!]);
  }
  const groupList = {
    kind: "APIGroupList",
    apiVersion: "v1",
    groups: [...groups].map(([name, versions]) => ({
      name,
      versions: versions.map((v) => ({ groupVersion: name ? `${name}/${v}` : v, version: v })),
      preferredVersion: { groupVersion: name ? `${name}/${versions[0]}` : versions[0], version: versions[0] },
    })),
  };
  const files: Record<string, string> = { "servergroups.json": JSON.stringify(groupList) };
  for (const [gv, list] of Object.entries(RESOURCES)) {
    const resources = list.flatMap((r) => [
      { name: r.name, singularName: r.kind.toLowerCase(), namespaced: r.namespaced, kind: r.kind, verbs: VERBS, ...(r.shortNames && { shortNames: r.shortNames }) },
      ...(r.subresources ?? []).map((s) => ({ name: `${r.name}/${s}`, singularName: "", namespaced: r.namespaced, kind: r.kind, verbs: ["get", "patch", "update", "create"] })),
    ]);
    files[`${gv}/serverresources.json`] = JSON.stringify({ kind: "APIResourceList", apiVersion: "v1", groupVersion: gv, resources });
  }
  return files;
}

/** The kind of a kubectl resource name (`deploy`, `deployments`, `deployment`, `deployments.apps`), or null. */
export function kindOfResource(resource: string): string | null {
  const [base, ...group] = resource.toLowerCase().split(".");
  for (const [gv, list] of Object.entries(RESOURCES)) {
    const g = gv.includes("/") ? gv.split("/")[0] : "";
    if (group.length && group.join(".") !== g) continue;
    const r = list.find((x) => x.name === base || x.kind.toLowerCase() === base || x.shortNames?.includes(base!));
    if (r) return r.kind;
  }
  return null;
}
