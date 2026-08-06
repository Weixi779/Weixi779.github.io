---
title: "Deconstructing and Rebuilding WICompress 2.0 in the Age of AI"
slug: wicompress-2-architecture-ai
publishedAt: "2026-08-02 12:00:00"
summary: "How a 204-line image compression utility became WICompress 2.0—and what that taught me about authorship in AI-assisted engineering."
tags: [Architecture, Image Processing, AI, Refactoring]
category: "iOS"
toc: true
math: false
draft: false
lang: en
translationKey: wicompress-2-architecture-ai
---

> **Note added later:** After this article was finished, I ran an independent review of WICompress 2.0 with the `Improve Codebase Architecture` skill. Its questions around deep modules, deletion tests, locality, and ownership largely validated the research and refactoring direction described here. The skill did not guide the refactor; this is not a causal story rewritten after the fact. Instead, the comparison showed that these judgments could travel beyond WICompress and led me to design [`does-it-still-make-sense`](https://github.com/Weixi779/skills/tree/main/skills/does-it-still-make-sense): not an Agent walking around with a broom forever, but an architectural pause I choose to trigger when the room may finally need cleaning—does the current shape still make sense?

## Before

WICompress[^1] did not begin with an architecture diagram. It grew out of one very specific problem.

Photos captured by an iPhone are often stored as HEIC, a format that already compresses efficiently. If an upload service does not accept HEIC, re-encoding the image as JPEG can produce a file larger than the original. I had performed a “compression” operation and ended up with a bigger image. That was the problem I originally wanted to solve.

I started from what I knew best: `UIImage`. I used its resizing and encoding capabilities first, then reached down into `ImageIO` only when `UIImage` could no longer answer the question. It was not an elegant route, but it reflected how an iOS developer new to image processing actually learns: begin with familiar tools, then extend the road one piece at a time.

The first WICompress really was small. In `v0.2.2`, the production Swift code consisted of four files and 204 physical lines. It solved a real problem, had a few tests, and was useful enough that I kept it around.

If the story had ended there, this article probably would not exist.

## When the Storm Hit

Much later, while preparing a technical talk, I asked AI to review the library I had left untouched for some time. I wrote about part of that experience in *The Observer*.[^2] AI did not have to retrace my learning path. It could begin directly from `ImageIO` and work backward from what encoded image data could actually support.

Why did the input have to be `UIImage`? It could just as naturally be `Data` or a file `URL`.

Why were format, orientation, metadata, and color space handled in separate paths? They could all be inspected at the encoded-data boundary.

Why were resizing and quality fixed together? Pixel dimensions, output representation, Alpha, canvas geometry, and final byte count are different dimensions of the problem.

Then came HDR, animation, progressive decoding, and incremental sessions. Within a few hours, an entire world I had barely examined was laid out in front of me.

At first I was impressed. The deeper the discussion went, the more clearly I could see how narrow my previous boundary of knowledge had been.

> “AI described a very tempting capability.”
>
> “That sounds powerful. Can we build it?”
>
> “Yes.”

And then it created a type for every stage.

As the requirements grew, `Policy`, `Resolver`, `ExecutionPlan`, and `Executor` appeared one after another. Every name sounded professional. Each could be explained in isolation. But they had not grown naturally from stable responsibilities. More often, they gave me—someone still unfamiliar with the lower-level APIs—a sense of safety: if the names looked enough like architecture, perhaps the code could keep moving forward.

The code grew from 780 physical lines in `v1.0.0` to 2,979 in `v1.4.0`.

| Version | Production files | Physical lines |
| --- | ---: | ---: |
| `v0.2.2` | 4 | 204 |
| `v1.0.0` | 14 | 780 |
| `v1.2.1` | 15 | 1,122 |
| `v1.4.0` | 27 | 2,979 |

Every production-code count in this article measures physical lines in Swift files under `Sources/` at the corresponding commit. Tests, the Example app, benchmarks, and documentation are excluded.

More code was not the real problem. The problem was that I could no longer explain, through one coherent flow, why the library had taken this shape.

## Two Roads Forced Into One Answer

When I formally began work on 2.0, I still did not have an answer.

The first step was to ask AI to list every existing capability. We produced a long table: resize, quality, target bytes, format, Alpha, crop, metadata, color space, passthrough, file URL, and more. Every item was accurate, but the table could only prove that those capabilities or historical behaviors existed. It could not tell us which ones still belonged in 2.0, let alone how they should compose.

So I reversed the question: if we ignored the existing types and policies, what was a caller actually trying to accomplish when they came to this library?

That was when I saw that `v1.4.0` appeared to have one compression flow but was really serving two very different needs.

The first was Process. The caller already knew what they wanted: whether to crop, the target dimensions, compression quality, output format, metadata, and color space. The library only needed to execute those explicit requirements.

The second was Target. The caller only knew that the final file had to be smaller than 500 KB. How far to lower quality, how much to reduce dimensions, and how many attempts to make all had to be searched internally.

Once those two intentions were drawn back onto the existing code, the first architecture diagram finally appeared.

![WICompress 1.4: Process and Target forced through the same policy pipeline](/images/wicompress-v1-pipeline.svg)

The diagram made the problem visible. We had never really treated them as separate flows. Target passed through a validator and resolver, then was translated back into the old `WICompressOptions`. Capabilities that could not be expressed there—such as `fill`, `exactCanvas`, and placement—were pushed into `WIWritePlan`. Both roads eventually had to pass through the same `WritePlanResolver` and `ImageEncoder`.

Several files kept absorbing responsibilities that did not belong to them:

| File | Lines in `v1.4.0` |
| --- | ---: |
| `WICompressionSolver.swift` | 537 |
| `WIImageEncoder.swift` | 451 |
| `WIWritePlanResolver.swift` | 385 |

Together, those three files accounted for 46.1% of the production library. `Solver` searched quality, dimensions, and PNG candidates. `Encoder` did far more than encoding: decode, thumbnail generation, resize, crop, canvas drawing, Alpha handling, orientation, metadata, and color-space conversion. `WritePlanResolver` interpreted every policy and decided whether to return the original, copy from the source, or render again.

The terminology borrowed from UI frameworks made things worse. `fit`, `fill`, `fitInside`, and `alignment` are not inherently wrong concepts, but WICompress is not an image presentation library. When I returned as the author, I could no longer explain their exact semantics without reading the implementation. A first-time user had even less chance.

Adding capabilities was not the mistake. The system had lost the language it needed to keep growing.

The diagram still did not tell me what 2.0 should look like, but it completed the first restart. After the analysis, the capability table, and repeated attempts to classify things, we could finally name the problem: two different roads had been forced into one answer.

Recognizing the problem did not mean we had found the solution. The first refactor only moved code into more targets and folders. ImageIO was extracted. Raster was extracted. Process got its own type. But none of the old resolvers, plans, solvers, or encoders truly disappeared.

## We Only Moved Things Around

![WICompress 2.0 under construction: new modules appeared while the old execution owners remained](/images/wicompress-transition-pipeline.svg)

This diagram comes from the point where the request-scoped `ImagePipeline` had just appeared. There was a new `WIImageIO`, a new `WIImageRaster`, and early discussion of Domain and Pipeline boundaries. Yet execution still required `ProcessResolver`, `TargetResolver`, `OutputResolver`, `ExecutionPlan`, and `CompressionSolver` to hand work from one to another.

The new Pipeline had not replaced the old owners. It had merely joined them.

At this point the production code contained 41 files and 4,056 physical lines. `WIImageIO.Source` had 589 lines, `ImagePipeline` had 430, and `CompressionSolver` had 431. During construction, production code peaked at 4,856 lines and 49 files.

Several logic-heavy files also approached or exceeded 500 lines at different points. These are their individual historical peaks, not measurements from a single commit:

| File | Historical peak |
| --- | ---: |
| `WIImageIO.swift` | 798 |
| `WICompressionSolver.swift` | 673 |
| `ImagePipeline+Target.swift` | 615 |
| `Source.swift` | 589 |
| `ImagePipeline.swift` | 495 |
| `WIImageEncoder.swift` | 487 |

File length was not the most important issue. An 800-line file may simply be unfinished cleanup, while a 100-line type may have no reason to exist. What bothered me was that the diagram was full of “interpreters.” One object interpreted the request and produced a plan. Another interpreted the plan and chose an executor. Then an executor was needed to reconnect everything the previous layers had explained.

We had separated the files without reducing anyone’s cognitive load.

## Tearing It Down

The turning point was not another attempt to design a more complete architecture. It was asking what each existing name actually contributed.

Why did `Inspector` exist? If inspection was an action, it could return a `Descriptor` directly.

Why did every helper need to know about `Source`? If decoding only required encoded data, and rendering only required a `CGImage` plus resolved geometry, neither operation should be polluted by an outer business container.

What pressure did `Resolver`, `ExecutionPlan`, and `Executor` actually remove? If a type merely moved a switch statement from one file to another, the number of types increased while the amount of work stayed the same.

For me, one of the most important forms of courage in programming is the willingness to discard the previous answer.

So instead of preserving the existing types, we returned to the needs the library actually served.

### Process and Target

Process and Target became two explicit entry points.

Process accepts a known intent. `WIImageResizing` only needs to perform `PixelSize → PixelSize`. A caller can use Luban or provide a custom sizing algorithm. Crop, output, metadata, and color space are explicit inputs; the Pipeline no longer guesses at UI semantics.

Target accepts a hard byte limit. It maps to real production constraints: sharing SDKs, attachment uploads, and API fields with fixed limits. The caller provides `maxBytes`, and the library searches quality and dimensions internally. A successful result must satisfy the limit; if it cannot, the operation fails explicitly.

```swift
let processed = try await WICompressor.process(imageData)

let target = try WICompressionTarget(maxBytes: 500_000)
let constrained = try await WICompressor.compress(imageData, to: target)
```

The two flows share `WIImageOutput` and the same lower-level execution capabilities, but they no longer pretend to be one policy model.

### ImageIO and Rendering

Once the compression domain was separated, the lower-level boundaries became clearer as well.

ImageIO owns inspection, decode, thumbnail generation, transcode, and encode for encoded image data. `WIImageRendering` uses Core Graphics to perform crop, resize, canvas drawing, background and Alpha handling, and color-space conversion. `CGImage` is the exchange value between those modules, not a new business center.

`WIImageIO` is not intended to be an all-encompassing ImageIO framework. It does not attempt to own the full world of animation, progressive decoding, or HDR; that was never the core purpose of WICompress. But for the static-image path, it wraps `CGImageSource`, `CGImageDestination`, property dictionaries, and finalization behind an API that reads naturally.

```swift
let encoded = try ImageReader(imageData)
    .thumbnail(options: .init(maximumPixelSize: 1_200))
    .encode(
        as: .jpeg,
        options: .init(compressionQuality: 0.75)
    )
```

At least for this static-image boundary, the API has reached the readability I wanted: state transitions are explicit, and ImageIO details do not leak back into high-level compression code. Some larger image libraries have much richer animation, caching, and progressive-decoding systems, yet their ImageIO use is still distributed across processors, serializers, or helpers. WIImageIO does less, which gives it the opportunity to describe this smaller path more clearly.

The chain API I had wanted for years survived only here. Not because chaining looks elegant, but because `ImageReader → ImageFrame → encoded Data` represents real state transitions. The high-level compression API remains a set of ordinary terminals. Turning every parameter into a chain does not reduce the cost of understanding the domain.

Rendering remains package-only for now. It can reliably render a single image, but it has not yet formed a public API worth publishing independently. A capability being wrappable does not mean it must be exposed. That restraint became part of 2.0 as well.

The commit that removed the old policy pipeline marked the construction phase’s temporary low point: production code fell from a peak of 4,856 lines to 3,880, a reduction of 976. Those lines did not disappear because large files were mechanically split. They disappeared because old paths and duplicate execution owners were actually removed.

But `3,880` was not the finish line. We then established the shared Domain, published the `WIImageIO` Reader and Frame API, completed selective metadata handling, rebuilt Rendering, separated TargetSearch, and added Luban 2 and async terminals. Production code grew again as real capabilities took their final shape.

## Keeping One Orchestrator

![WICompress 2.0: the capabilities remain, but execution has one orchestrator](/images/wicompress-v2-pipeline.svg)

The final structure is surprisingly plain.

`WIImageProcess` and `WICompressionTarget` describe two public intentions. Once a request enters `ImagePipeline`, the original input, descriptor, working image, and candidate search state exist only for that request. The Pipeline is the only component that understands the complete flow.

ImageIO provides inspection, decode, transcode, and encode. Rendering performs pixel drawing. `TargetSearch` only maintains feedback for candidate search. Each receives the inputs it actually needs and returns a definite result. None knows about an outer container or tries to understand the complete compression business.

The final `v2.0.0` contained 40 production Swift files and 4,713 physical lines—833 more than the temporary low point and also more than `v1.4.0`. Its largest file, `ImagePipeline.swift`, still had 474 lines, but no production file exceeded 500.

The code did not return to 204 lines, nor should it have. Real capabilities require real code. The Target benchmark, Example app, Chinese and English DocC, migration guide, and architecture documents sit outside this production-code count; together, they gave this small library a complete engineering boundary.

The change was not that the code became smaller. It was that I could now open any module and explain why it existed.

## The Author in the Age of AI

This refactor could not have happened without AI.

It helped me relearn ImageIO and Core Graphics, study Nuke[^3], Kingfisher[^4], SDWebImage[^5], and Signal[^6], compare sizing APIs from Android and the Web, verify Swift 6.2 concurrency semantics, and build tests, benchmarks, documentation, and migration guides. Much of the implementation arrived quickly. Review also stopped being a single pass: one agent wrote code, while another challenged its error semantics, memory lifetime, platform builds, and public API.

That workflow pushed the output of one person far beyond what I had previously considered possible.

But AI is equally good at something else: producing a complete proposal for every possibility. If you keep asking, it can always add another service, protocol, registry, or extension point. Every proposal can be explained, and most of them can genuinely work.

The problem is that a proposal is not a requirement. The fact that something can be built does not qualify it to enter the work.

Unless someone keeps asking, “Who does this serve?”, “What state does it own?”, “Which old path does it remove?”, and “Do we need it now?”, AI will naturally fill every available space. The architecture becomes more complete while the work becomes less recognizably your own.

So I cannot summarize the experience as “AI adds, humans delete.” AI proposed many of the good designs that survived, and I made wrong decisions too. The real distinction is that someone must ultimately own the boundary: why Process and Target are separate, why the Pipeline is not public, why Rendering is not yet published, why animation is deferred, why 2.0 requires Swift 6.2, and why some historical capabilities were intentionally left behind.

None of those decisions emerged automatically from adding another type.

A large refactor was not a full rewrite triggered by one moment of insight either. ImageIO, Rendering, Domain, Pipeline, and TargetSearch found their places through many small changes. Each time, we removed one piece of duplicate ownership, ran the tests, committed, and looked at the entire diagram again. The decisions from the morning were challenged again in the afternoon, until no name remained that even the author could not explain.

AI accelerated the implementation. The author still had to take responsibility for the shape that remained.

## 2.0

On August 2, 2026, WICompress 2.0 was released.[^7]

It is now a UIKit- and AppKit-free Swift 6.2 image processing and compression library for Apple platforms. It exposes explicit Process and Target flows, while publishing `WIImageIO` as an independent product for callers who need the lower-level image boundary. The Example app, benchmark, bilingual DocC, migration guide, and architecture documentation are part of the release as well.

It is not a complete answer to the image world. Animation, progressive decoding, and comprehensive HDR handling remain outside the current boundary, and the Target algorithm still has room for continued benchmarking and optimization. None of those capabilities needs to enter the code merely to make 2.0 look complete. When a real requirement arrives, the boundary can be reconsidered.

When I wrote *The Observer*,[^2] I wondered what remained for an author once AI had compressed both exploration and implementation. WICompress 2.0 did not make time move slowly again, but it gave me a practical answer: AI can produce many answers quickly; deciding which one remains still belongs to the author.

This time, I was not only an observer.

[^1]: [WICompress](https://github.com/Weixi779/WICompress)

[^2]: [The Observer](https://weixi779.github.io/posts/observer/)

[^3]: [Nuke](https://github.com/kean/Nuke)

[^4]: [Kingfisher](https://github.com/onevcat/Kingfisher)

[^5]: [SDWebImage](https://github.com/SDWebImage/SDWebImage)

[^6]: [Signal-iOS](https://github.com/signalapp/Signal-iOS)

[^7]: [WICompress 2.0 Release](https://github.com/Weixi779/WICompress/releases/tag/v2.0.0)
