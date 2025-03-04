---
title: 「iOS」谈谈iOS图片压缩
catalog: true
top: false
mathjax: true
date: 2025-03-04 21:56:34
summary:
tags: [图片压缩, 算法]
categories: [iOS]
---

# 谈谈iOS图片压缩

在上一篇文章中，我们探讨了图片压缩的基本概念，主要包括**分辨率压缩**和**质量压缩**。尽管这些方法在不同平台上的实现方式相似，但在 iOS 上，传统的压缩代码效果并不理想。因此，我们对 iOS 平台的图片压缩算法进行了深入研究。本文将从图片格式入手，逐步分析 iOS 的压缩逻辑，并分享一个 **Swift Package**，帮助开发者更高效地处理图片压缩。

## 图片格式

在深入探讨图片压缩之前，首先需要了解各种图片格式类型，格式对应特定的压缩策略。对于各位客户端开发人员来说，JPEG 和 PNG 格式相信已经非常熟悉。然后在 Apple 平台中，自iOS 11 推出以来，HEIC 格式已成为iOS平台的主流图片格式。本文将对这三种格式进行简要讨论，以便更好地理解它们在压缩过程中的应用与优化策略。

### JPEG（Joint Photographic Experts Group）

JPEG由联合图像专家组于1992年推出，专为减少照片和复杂图像的文件大小而设计。通过采用离散余弦变换、霍夫曼编码等计算机图形学领域的先进算法，JPEG实现了高效的压缩能力。时至今日，它仍然是计算机界最广泛使用的图片格式之一。

* **有损压缩**: 通过有损压缩，JPEG可以设置丢弃部分图像数据以减小文件大小，从而在一定程度上降低图像质量。

> jpg 与 jpge 归根结底是一种东西，在远古时代文件扩展名只能三位展示缩写带来疑惑

### PNG（Portable Network Graphics）

PNG格式由W3C于1996年推出，旨在作为GIF格式的替代方案，提供一种无版权限制的图像格式。PNG的出现有效解决了JPEG的两个主要问题：

* **透明通道**：PNG支持透明通道(RGBA)，允许图像在不同背景下呈现出更加灵活和自然的效果。这一特性使得PNG在网页设计、图标制作和用户界面元素等应用中尤为重要。

* **无损压缩**：PNG采用DEFLATE算法等无损压缩技术，能够在不丢失任何图像数据的情况下显著减小文件大小。然而，PNG的压缩效率高度依赖于图像内容本身，对于包含复杂图案或高细节的图像，压缩效果可能不如简单图像理想。

### **HEIF（High Efficiency Image File Format）**

HEIF 是一种用于存储单张图像和图像序列的**容器格式**。它可以包含图像、音频、视频、文字等多种媒体内容。 HEIF 可以存储采用多种编码格式的图像，例如 SDR（标准动态范围: Standard Dynamic Range）和 HDR（高动态范围: High Dynamic Range）图像。

* **压缩格式**：可选择相应压缩技术（常见的有`HEVC`、`AVIF`）在较小文件体积下保持高质量图像。
* **多帧存储**：支持存储多张图片，比如连拍或动画效果。
* **扩展性强**：可以包含透明度信息、深色模式数据、元数据等额外信息。

### HEIC (**High Efficiency Image Coding**)

再说 HEIC 前，先聊聊HEVC。HEVC，亦称 H.265，是一种用于视频和图像数据的高效压缩标准。相比 H.264，它能在保持相同质量的情况下减少约 50% 的文件体积。HEIC 格式采用 HEVC 作为其图片压缩方式，因此 HEIC 具备更高的压缩率和质量表现。

HEIC 是 HEIF 的一种编码实现，采用 **HEVC压缩格式编码**，即 **HEIF + HEVC = HEIC**。自 iOS 11 起，HEIC 成为 Apple 设备的默认照片格式。相较于 JPEG，它在相同质量下占用更小的存储空间，同时支持更丰富的色彩信息，但在部分非 Apple 设备上可能需要转换为 JPEG 才能查看。

* **单张/多张支持**：可以存储单张图片或多张图片（例如，包含连拍图片）。
* **存储效率高**：在相同分辨率下，HEIC 文件大小更小，质量更高。
* **兼容性问题**：虽然在苹果设备上原生支持 HEIC，但在部分 Windows、Android 等系统中，可能需要额外软件或转换为 JPEG 才能查看。

如果你使用苹果的 iPhone 或 iPad 拍照，照片会以 .heic 文件扩展名保存。HEIC 是一种容器格式，可以存储使用 HEVC 格式编码的图像和声音。

例如，如果在 iPhone 上启用了 Live Photos（实况照片）功能，拍摄的照片会生成一个包含多个照片和录音文件，该照片会以 HEIC 格式保存。

## 压缩思路

在上篇文章中介绍了，压缩图片最终整体大小要分别处理两个方面，`图片分辨率大小` 与 `图像质量`. 下面聊聊怎么在iOS平台中处理这两个方面。

### 分辨率压缩

先说简单的 压缩分辨率，这个主要传入UIImage就可以，以下为实例代码:

```swift
/// Resizes the given image to a specific target size.
/// - Parameters:
///   - image: The `UIImage` to be resized.
///   - targetSize: The desired size (`CGSize`), including width and height.
/// - Returns: A new resized `UIImage`, or `nil` if resizing fails.
public func resizeImage(_ image: UIImage, to targetSize: CGSize) -> UIImage? {
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = UIScreen.main.scale  // 适配 Retina 设备
    let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)

    return renderer.image { _ in
        image.draw(in: CGRect(origin: .zero, size: targetSize))
    }
}
```

具体什么大小就可以根据之前说的`luban`算法进行处理，可以参考上篇文章对源码分析内容

### 图像质量 

质量压缩的核心挑战在于 **iOS 中 UIImage 并不携带文件格式信息**，而 Data 仅包含二进制数据，并不记录图像的分辨率。因此，在 iOS 平台上，**区分图片类型** 需要额外的判断逻辑，才能选择正确的压缩策略（如 pngData()、jpegData(quality:) 等）。

所以作者在这里目前设计的思路是:

1. 传入选中文件的`UIImage` 与 `Data`
2. 根据 `Data` 类型辨别出对应图片类型
3. 根据第2步的图片类型 将 `UIImage` 转换为对应 图片`Data` 并采取对应压缩策略  (e.g.: image.pngData()、image.jpegData(0.6) 内置方法)

### HEIC压缩策略

一直说压缩策略压缩策略，那么HEIC的压缩策略到底是什么?

```swift
    /// Returns HEIC data representing the image, or nil if such a representation could not be generated. HEIC is recommended for efficiently storing all kinds of images, including those with high dynamic range content.
    @available(iOS 17.0, *)
    public func heicData() -> Data?
```

在iOS17官方新增了对HEIC数据的转换，可以直接使用，效果很好，整体的大小也控制的不错 而且还能支持实况功能。

但苦逼的客户端有些事是需要妥协的，**如果文件上传不支持HEIC文件怎么处理呢?** 亦或者说 **系统版本并不支持 iOS17呢?**

我们这次主要要说的就是这件事

在什么都不做的情况下，直接走 `image.pngData()`，或者 走对应压缩比例的 jpegData，效果会非常差，甚至反向压缩，因为 H.265 是相当高效的压缩方式，手动改为 H.264 必然会导致后面总体数据反向增大。

目前的解决方案是手动写一个 H.265 压缩格式 的导出数据办法，并添加类似 jpeg 类似压缩系数。

```swift
    /// 将 UIImage 转换为 HEIC 格式的 Data
    /// - Parameters:
    ///   - image: 需要转换的 UIImage
    ///   - quality: 压缩质量（0.0 - 1.0），默认 1.0（最高质量）
    ///   - lossless: 是否使用无损压缩，默认为 false
    /// - Returns: 转换后的 HEIC 格式 Data，若转换失败则返回 nil
    func heicData(_ image: UIImage, quality: CGFloat? = 1.0, lossless: Bool = false) -> Data? {
        guard let cgImage = image.cgImage else { return nil }

        let mutableData = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(mutableData, UTType.heic.identifier as CFString, 1, nil) else {
            return nil
        }

        var options: [CFString: Any] = [:]
        if !lossless {
            options[kCGImageDestinationLossyCompressionQuality] = quality ?? 1.0
        }

        CGImageDestinationAddImage(destination, cgImage, options as CFDictionary)

        return CGImageDestinationFinalize(destination) ? mutableData as Data : nil
    }
```

## 后结

在 iOS 平台，合理使用 HEIC 可以在保证图片质量的同时大幅减少存储占用。不过，由于 HEIC 兼容性有限，在某些场景（如 Web 或跨平台应用）仍建议使用 JPEG 或 PNG。开发者可以使用 **CGImageDestination API** 进行自定义 HEIC 压缩，或在 **iOS 17+** 直接使用官方 heicData() API 提高开发效率。

**完整的 HEIC 压缩方案已封装为 Swift Package**，可在 [GitHub 仓库](https://github.com/Weixi779/WICompress) 找到。该库轻量支持二次封装，开发者可根据需求灵活调整。本文主要分享核心思路，具体实现可参考源码。欢迎大家试用并提出建议！祝愿各位Happy Coding~
