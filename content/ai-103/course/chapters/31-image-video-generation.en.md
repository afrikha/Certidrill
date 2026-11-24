Foundry serves image models (the GPT-image series) and a video model (Sora 2) through the OpenAI-compatible v1 API of the Foundry resource. Exam questions ask you to pick the right operation (generate or edit, create or remix), complete a short Python call, and choose the parameter that meets a constraint: a transparent background, preserved faces, low latency, a fixed first frame, a change that must not touch the rest of the picture.

<!-- section: image-generation | objectives: 3.1.1 -->
## Generating images from text prompts and reference media

DALL-E 3 was retired on March 4, 2026: its deployments no longer work. Image generation now uses a `gpt-image` model.

| Model | Access | What to remember |
| --- | --- | --- |
| `gpt-image-1`, `gpt-image-1.5` | Limited access (application form) | Sizes `1024x1024`, `1024x1536`, `1536x1024`; default quality `high`; 1.5 has better latency than 1 |
| `gpt-image-1-mini` | Limited access | Cheaper and faster; default quality `medium`; no `input_fidelity`, no face preservation |
| `gpt-image-2` | Generally available | Custom `WIDTHxHEIGHT`: edges multiples of 16 px, long edge up to 3,840 px, aspect ratio up to 3:1, 655,360 to 8,294,400 pixels in total; realism, higher latency and cost |
| `gpt-image-2.5-sunburst` / `gpt-image-2.5-flare` | Generally available | Custom sizes with the same edge, aspect-ratio (1:3 to 3:1) and pixel-count rules; above `2560x1440` is experimental. Sunburst: highest fidelity and editing precision. Flare: fastest, optimized for speed and cost |

Common to all of them: text and image input, 1 to 10 images per request (`n`), a prompt of up to 4,000 characters, and output **only as base64** (`b64_json`). There is no URL output, and `response_format` isn't supported.

```text
import base64
from openai import OpenAI
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://ai.azure.com/.default"
)
client = OpenAI(
    base_url="https://contoso-ai.openai.azure.com/openai/v1/",
    api_key=token_provider,
)

result = client.images.generate(
    model="image-gen",                  # deployment name
    prompt="Studio photo of a ceramic mug on a walnut desk, soft daylight",
    size="1536x1024",
    quality="medium",
    n=2,
)
for i, item in enumerate(result.data):
    with open(f"mug-{i}.png", "wb") as f:
        f.write(base64.b64decode(item.b64_json))
```

With keyless authentication, the calling identity needs the **Cognitive Services OpenAI User** role on the resource. A typical generation takes 10 to 30 seconds. The default quota of the GPT-image-1 series and GPT-image-2 is 5 images per minute.

**Reference media.** The `generations` operation takes text only. To start from existing pictures (product photos, a logo, a character sheet), call the **edits** operation (`images.edit`, `POST .../images/edits`, `multipart/form-data`): it accepts up to 16 input images, PNG or JPG, each under 50 MB, and the prompt says how to combine them ("place this bottle on the beach scene").

**From a chat model.** The Responses API offers the tool `{"type": "image_generation"}`: a chat or reasoning model decides to draw, the image deployment is named in the header `x-ms-oai-image-generation-deployment`, and the image comes back as base64 in the `result` of an output item of type `image_generation_call`. The tool supports the GPT-image-1 series and the GPT-image-2.5 models (Learn doesn't list `gpt-image-2` for it), and not multi-turn editing. It doesn't stream; to stream partial images, call the image API directly with `stream=True` and `partial_images`.

> **Exam trap.** "Use our three product photos to create a lifestyle picture" is an **edit** call with several input images, not `images.generate`: the generation operation has no image input.

<!-- section: video-generation | objectives: 3.1.2 -->
## Generating videos from text prompts and reference media

Video generation uses the `sora-2` model (preview). Sora 2 produces video **with audio**, is billed per second, and accepts three input modes: text only, image plus text, and a generated video plus text.

Generation is an **asynchronous job**: create it, poll it, then download the result.

```text
import time

video = client.videos.create(
    model="sora-2",                     # deployment name
    prompt="Slow dolly shot of a bakery counter at dawn, warm light",
    size="1280x720",
    seconds=8,
    input_reference=open("first-frame.png", "rb"),   # optional
)
while video.status not in ["completed", "failed", "cancelled"]:
    time.sleep(20)
    video = client.videos.retrieve(video.id)

if video.status == "completed":
    content = client.videos.download_content(video.id, variant="video")
    content.write_to_file("bakery.mp4")
```

| Parameter | Values |
| --- | --- |
| `size` | `720x1280` (portrait, default) or `1280x720` (landscape) |
| `seconds` | `4` (default), `8`, `12` |
| `input_reference` | One image (JPEG, PNG or WebP) used as a visual anchor for the **first frame**; its resolution must match `size` exactly |

Job facts the exam likes:

- Statuses: `queued`, `in_progress`, `completed`, `failed`, `cancelled`. A failed job explains itself in `failure_reason`; a prompt blocked by content filtering returns no video.
- A job takes 1 to 5 minutes, depending on resolution and duration.
- Two creation jobs can run at the same time; wait for one to finish before starting a third.
- A job is available for 24 hours; after that, create a new one.
- Write the prompt in English or another Latin-script language for best results.

Content restrictions of the Sora 2 API: only content suitable for audiences under 18, no copyrighted characters or music, no real people (public figures included), and input images containing human faces are rejected.

> **Exam trap.** `videos.create` returns at once with a `queued` job, not a video. Code that downloads right after `create`, without polling until `completed`, fails.

<!-- section: image-editing | objectives: 3.1.3 -->
## Image editing: inpainting, masks and prompt-driven changes

The edits operation changes an existing image. All the `gpt-image` models support it.

| Requirement | Technique |
| --- | --- |
| Replace only the sky, keep every other pixel | **Inpainting**: image + mask + prompt |
| Change the style or mood of the whole picture | Prompt-driven edit: image + prompt, no mask |
| Combine several pictures into a new one | Edit with several input images |
| Keep a person's face recognizable across edits | `input_fidelity` set to high, on a model with face preservation (not `gpt-image-1-mini`) |
| A completely new picture | `images.generate`, not an edit |

Mask rules:

- The mask is a PNG with the **same dimensions** as the input image.
- **Fully transparent pixels** (alpha = 0) mark the area to edit; opaque pixels are kept.
- The prompt describes the result you want, for example what must replace the masked object.

```text
result = client.images.edit(
    model="image-gen",
    image=open("living-room.png", "rb"),
    mask=open("sofa-mask.png", "rb"),     # transparent where the sofa is
    prompt="Replace the sofa with a green velvet armchair",
    size="1024x1024",
)
with open("living-room-edited.png", "wb") as f:
    f.write(base64.b64decode(result.data[0].b64_json))
```

Without a mask, the model may change any part of the picture: the edit follows the prompt, not a region. Each edit is a new image, so a review step between edits (human or automated) prevents drift over several iterations.

> **Exam trap.** "Change only the product label and leave the rest of the photo untouched" requires a **mask**. A new generation, or an edit without a mask, rebuilds the whole picture and can alter the background, the lighting or the product itself.

<!-- section: video-editing | objectives: 3.1.4 -->
## Editing generated videos

A generated video is edited by **remixing** it: Sora 2 makes a targeted adjustment instead of regenerating from scratch.

```text
remix = client.videos.remix(
    video_id=video.id,                  # a completed video
    prompt="Shift the color palette to teal and sand, with a warm backlight",
)
# remix is a new job: poll it with videos.retrieve, then download it
```

- The source must be a **successfully completed** video, identified by its ID (`video_...`), and still available: jobs are kept 24 hours.
- The remix keeps the structure, the scene transitions and the layout of the original.
- Make **one clearly articulated change per remix** (palette, lighting, an object's color). Narrow edits preserve fidelity and reduce visual defects; chain several remixes for several changes, reviewing each result.
- The remix is a new asynchronous job, with the same polling, download and content filtering as any creation.

| Requirement | Approach |
| --- | --- |
| Same shot, different lighting or colors | Remix with one adjustment |
| Several changes, each reviewed | A chain of remixes, one change each |
| A different scene or story | A new `videos.create` with a new prompt |
| The clip must start from an approved still image | `videos.create` with `input_reference` |
| Continue from a generated clip with a new instruction | Video plus text input (generated video to video) |

> **Exam trap.** Sending the original prompt again with one word changed is not an edit: a new generation changes the composition, the camera movement and the timing. To keep the clip and change one aspect, use **remix**.

<!-- section: generation-controls | objectives: 3.1.5 -->
## Choosing generation and editing controls

| Control | Values and rules |
| --- | --- |
| `size` | Image: fixed list (GPT-image-1 series) or custom `WIDTHxHEIGHT` (GPT-image-2 and later), or `auto`. Video: `720x1280` or `1280x720` |
| `quality` | `low`, `medium`, `high` (GPT-image-2.5 adds `xhigh` and `max`). Lower quality = lower latency and cost |
| `n` | 1 to 10 images per request |
| `output_format` | `png` (default) or `jpeg`; WebP isn't supported |
| `output_compression` | 0 to 100, for JPEG output |
| `background` | `transparent` or `auto`; transparency requires PNG |
| `mask` | PNG, same size as the image, transparent = area to edit |
| `input_fidelity` | How closely the output keeps the style and features (faces) of the input images; not on `gpt-image-1-mini` |
| `stream` + `partial_images` | Progressive preview of the image while it's generated (documented for the GPT-image-1 series and GPT-image-2) |
| `user` | Your end-user identifier, to track usage |
| `seconds`, `input_reference` | Video duration; first-frame anchor |

| Requirement | Control |
| --- | --- |
| A logo to place on any web page color | `background="transparent"` with `output_format="png"` |
| Smallest files for a catalog | `output_format="jpeg"` and a lower `output_compression` |
| Fast drafts in a design tool | `quality="low"` or a faster model (`gpt-image-1-mini`, `gpt-image-2.5-flare`) |
| Show progress to the user while the image renders | `stream=True`, `partial_images` |
| Four options to choose from | `n=4` |
| A 21:9 banner | A model that accepts custom sizes (`gpt-image-2` and later) |

The platform adds controls you don't set per request. Guardrails (content filters) apply to every image prompt, input image and output: a blocked request fails with the error code `contentFilter` ("Your task failed as a result of our safety system") and a blocked output with "Generated image was filtered as a result of our safety system". Photorealistic images of minors are blocked by default. Generated images carry Content Credentials (see the chapter on responsible AI for multimodal content).

A good prompt states the subject, the composition, the style and the lighting; for video, add the shot and the camera movement. Sora 2 is weak at complex physics, cause and effect, left and right, and precise timing of events such as camera moves: keep such requirements simple.

> **Exam tip.** Transparent background, PNG and JPEG compression are linked: `background="transparent"` with `output_format="jpeg"` can't work, and `output_compression` only matters for JPEG.

<!-- section: key-points -->
## Key points

- DALL-E 3 is retired; use a `gpt-image` model. Output is base64 only (`b64_json`).
- `images.generate` = text to image; `images.edit` = image(s) + prompt, with an optional mask; up to 16 input images.
- Mask: PNG, same size, transparent pixels = area to change. No mask = the whole picture may change.
- `input_fidelity` keeps faces and style; not available on `gpt-image-1-mini`.
- Sora 2: asynchronous job (`videos.create`, poll `videos.retrieve`, `download_content`), 4, 8 or 12 seconds, two concurrent jobs, kept 24 hours.
- `input_reference` = first frame, same resolution as `size`; faces in input images are rejected.
- Edit a generated video with `videos.remix`, one change per remix.
- Transparent background requires PNG; `quality="low"` for speed; `stream` with `partial_images` for progressive display.
