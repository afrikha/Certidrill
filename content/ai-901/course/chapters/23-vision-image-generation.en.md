Vision in Foundry goes in two directions: a multimodal model reads an image and answers in text, and a generative model creates an image or a video from a description. The exam checks that you choose the right kind of model, know where to test it in the portal, and can read the code that sends an image or saves a generated one.

<!-- section: image-analysis | objectives: 2.3.1 -->
## Interpreting images in a prompt

A **multimodal model** understands more than one type of data at the same time. Vision-enabled models such as GPT-4.1, GPT-4.1-mini or the GPT-5 series accept text and images in the same prompt and answer in natural language, without a separate vision pipeline. They can:

- describe the content of an image;
- answer questions about the objects, the text or the scene it shows;
- extract meaning from charts, diagrams, screenshots, documents and photos;
- follow a text instruction about the image, such as "list the visible defects in three bullet points".

To test this in the Foundry portal:

1. Deploy a vision-enabled model from the model catalog.
2. In the model playground, optionally write **Instructions** such as "You help people identify vintage computer hardware."
3. Upload an image in the chat pane and type a prompt such as "What can you tell me about this?"

The prompt has two parts sent together: a text instruction and one or more images. In code, an image is given as a URL or as base64-encoded image data.

| Scenario | Why a multimodal model fits |
| --- | --- |
| A support application analyzes photos sent by customers | The question changes with each photo |
| A learning tool explains a diagram or a chart in plain language | The answer is free text |
| An agent reviews screenshots and uploaded documents | Image understanding and reasoning in one call |

> **Exam trap.** The model must be vision-enabled. A deployment of a text-only model, or of an embedding model, can't interpret an image, whatever the prompt says.

<!-- section: image-generation | objectives: 2.3.2 -->
## Creating visual output with generative models

Image-generation models do the reverse of image analysis: they produce an image that matches a text description.

| Model | Use |
| --- | --- |
| **GPT-Image-1.5** | The most advanced of the family: high-fidelity creation and precise editing, for branding, marketing and design |
| **GPT-Image-1** | General-purpose generation: text-to-image, variations and editing |
| **GPT-Image-1-Mini** | Lighter and cheaper: experiments, internal tools, high volume |
| **FLUX** (Black Forest Labs) | A partner family for photorealistic and stylistically flexible images |
| **Sora** | Video generation from text, and from an image as a starting point |

To generate an image in the portal, deploy an image-generation model: in the model catalog, filter the inference tasks on **Text to image**. The image playground opens; describe the image you want, with its subject, style and colors, for example "A modern flat illustration of a robot holding a potted plant, pastel colors". A precise description gives a result closer to the intent.

Video generation works the same way in the video playground, where you also set the dimensions and the duration. Because it takes minutes, it runs as an **asynchronous job** through the API: create the job, poll its status until it is `completed`, then download the MP4 file.

Sora models apply responsible AI restrictions, such as limits on real people and copyrighted characters.

> **Exam trap.** "Create", "draw" or "design" an image calls for an image-generation model, not for a vision-enabled chat model. "Describe" or "read" an image calls for a multimodal model. Sora generates video; the GPT-Image family generates still images.

<!-- section: vision-app | objectives: 2.3.3 -->
## A lightweight application with vision capabilities

Both kinds of application use the `openai` package and a client created with the endpoint and the key of the Foundry resource:

```text
from openai import OpenAI

client = OpenAI(
    base_url="https://<resource>.openai.azure.com/openai/v1/",
    api_key=key,
)
```

**Analyzing an image.** The user message contains two content items, one of type `input_text` and one of type `input_image`:

```text
response = client.responses.create(
    model="my-vision-deployment",
    input=[{
        "role": "user",
        "content": [
            {"type": "input_text", "text": "What is in this image?"},
            {"type": "input_image", "image_url": image_url},
        ],
    }],
)
print(response.output_text)
```

**Generating an image.** The application sends a prompt to the deployment of an image-generation model and receives the image as base64 text, which it decodes and saves:

```text
import base64

result = client.images.generate(
    model="my-image-deployment",
    prompt="A vintage PC with a CRT monitor",
    n=1,
    size="1024x1024",
)
with open("output.png", "wb") as f:
    f.write(base64.b64decode(result.data[0].b64_json))
```

| | Image analysis | Image generation |
| --- | --- | --- |
| Deployment | A vision-enabled (multimodal) model | An image-generation model |
| Call | `responses.create` | `images.generate` |
| Input | `input_text` and `input_image` items | `prompt`, number of images `n`, `size` |
| Output | Text in `output_text` | A base64 image in `b64_json`, to decode with `base64.b64decode` |

Base64 encoding turns binary data, such as an image, into text that can travel inside JSON. That is why a local image is base64-encoded before it is sent, and why a generated image must be decoded before it is written to a file.

An image can also be generated through the Responses API: the request adds the tool `{"type": "image_generation"}`, and the base64 image comes back in an output item of type `image_generation_call`.

> **Exam tip.** In both snippets, `model` is the name you gave the deployment, not the name of the model in the catalog. A deployment of GPT-4.1-mini named `my-vision-deployment` is called with `model="my-vision-deployment"`.

<!-- section: key-points -->
## Key points

- Image in, text out: a vision-enabled multimodal model; the prompt combines text and one or more images.
- Text in, image out: an image-generation model (GPT-Image family, FLUX); text in, video out: Sora, as an asynchronous job.
- Portal: upload an image in the model playground to analyze it; use the image playground to generate.
- Analysis code: `responses.create` with `input_text` and `input_image`; result in `output_text`.
- Generation code: `images.generate` with `prompt`; result in base64, decoded and saved to a file.
- Images travel as a URL or as base64 data.
