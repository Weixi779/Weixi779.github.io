---
title: 「iOS」聊聊Markdown中的LaTeX
catalog: true
top: false
mathjax: true
date: 2025-09-06 22:32:48
summary: 此后如竟没有炬火，我便是唯一的光。
header-img: /images/latex.jpg
tags: [Markdown, LaTeX]
categories: [iOS]
---

# 背景

最近在做AI应用的核心功能, 对AI返回的Markdown部分整体处理, 尝试过、使用过目前能在GitHub上搜索到的大部分iOS库, 但是很遗憾, 要么 UI 展示效果差强人意, 要么功能支持不完整. 部分高赞库功能全面, 但放到 SwiftUI 异步渲染 + CollectionView 桥接场景下会出现严重兼容问题. 没有什么办法只能自己去设计整体的流程, 慢慢看到了swift-markdown, 对其进行了二次封装, 开始整体将从预处理开始到解析最终渲染的全流程掌握到了自己手里, 其中也算是路途艰辛, 查阅了巨量的开源库参考, 但是没想想到整体的流程设计到逻辑时间 与 处理LaTeX的时间差不多... 这篇文章主要以LaTeX部分为主, 但是多少会设计一些Markdown的基础概念, 本文作者会主要介绍我调研iOS的LaTeX的整体流程以及到实现过程中踩过的坑, 以及最后对作者对开源社区做的一些微薄之力进行分享.

# 历史演变

## markdown历史背景

如果你比较关心Markdown库的实现逻辑, 那么你会注意到一件事情, 那就是无论是 iOS or Android 开源库都很少默认支持LaTeX语法, 虽然我们最近总是使用这个相关AI能力, 总感觉他是一个很普遍的功能. 但究其原因其实是cmark(CommonMark reference implementation in C)中原版支持的就少, 实际上他只支持这些功能.

- 标题（#、## 等）
- 段落 / 换行
- 列表（有序 / 无序）
- 引用块（>）
- 代码块 / 行内代码
- 链接 / 图片
- 强调（*italic* / **bold**）
- 水平分割线（---）

CommonMark 标准未定义，cmark 官方实现不支持，而 cmark-gfm 在此基础上加了扩展其实就是都是后期加出来来的, 以下常见的内容其实原版都没有

- 不支持表格
- 不支持任务列表（- [x]）
- 不支持脚注
- 更不用说数学公式（LaTeX）

所以也有一部分库连表格效果也不支持, 第1渲染麻烦, 第2默认Markdown就是为了简化文字排版流程也压根不需要那么复杂.

没有官方定义导致了其实 LaTeX 也是有很多表述方式的. `$...$` 、`$$...$$`、`\(...\)`、`\[...\]`、`\begin{equation} / \begin{align}`其实这些都是真正能够使用的LaTeX格式, 美元是TeX 社区常用的简写; 转义括号是 AMS 推荐的写法，很多 LaTeX 引擎更偏向这一套; \begin等才是完整环境;不同解析库选择的默认支持不一致,因此兼容性问题很普遍.所以许多第三方库没必要费力不讨好做这些事情. 这就引出了 iOS 开发中常用的 Swift-Markdown 框架, 它本身也有不少限制.

## swift-markdown架构

但是问题就扔到了开发者头上, 比如作者的需求就是使用美元符号去做区分. 那作者翻了一段获取了这么多信息, 觉得自己很强了, 我要对官方库进行fork简单二次封装即可, 暴露给外界一个vitor方法就好了, 不看不知道, 一看吓一跳. 

> swift-markdown → swift-cmark → cmark-gfm → commonmark/cmark
>
> * swift-markdown: 只是 Swift wrapper 和 AST 建模层, 它自己并不做解析逻辑, 靠 swift-cmark 提供的 C 接口
> * swift-cmark:  就是个 Swift <-> C 的桥接, 它也不做解析, 只是把底层 cmark AST 映射到 Swift
> * cmark-gfm: 真正的解析器, GitHub 在这里加了表格 / 删除线 / task list 之类扩展, 所以我们如果自定义解析内容要在这里处理
> * cmark: CommonMark 的官方参考实现，功能最纯净

所以理论上只要改 cmark-gfm, 但在 SwiftPM 依赖链里常常要全链路维护 fork, 工作量依然很大. 恭喜你要准备好fork三个库的打算, 而且还要自己研究桥接流程什么. 作者看到了这里之后就果断放弃了. 

# 内容提取

## 初步问题

swift-markdown 其实是支持相关自定义语法的, 那么这样的话我们对我们的markdown内容做一些预处理就可以达到我们想要的效果. 但是好用么? 我感觉算不上, 在我写的最初版本的Markdown有一个问题就是, 简单的markdown都可以通过自定义的 `BlockDirective` 或者 `InlineAttributes` 去二次封装, 但是当遇到了复杂的公式就完全不工作. 

```latex
\\begin{cases}
\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0} \\\\
\\nabla \\cdot \\vec{B} = 0
\\end{cases}
```

这是一个LaTeX的方程组表现形式, 但是markdown的 `BlockDirective` 是 `@BlockKeyword { content }` 这样的效果导致与嵌套的大括号会有问题. 我在GitHub上开了一个[issue](https://github.com/swiftlang/swift-markdown/issues/236)但目前始终也是无人回复. 经过翻阅一些资料, 最后采用 `<LaTeX> <\LaTeX>` 的xml格式进行内容处理, 好处是能够完全保留LaTeX的内容, 但是代价是需要手动换行以及通过正则表达式获取到到content的内容, 那么到这里LaTeX的内容我们就可以成功的拿出来了.

另外补充一点 `InlineAttributes` 的关键字效果是 `^[content](InlineKeyword)` 虽然LaTeX中很少会出现中括号的内容但是依然存在可能性, 所以 inline的部分我们也需要进行修改, 作者采用的是对content进行inlineCode `content` 进行二次包装避免了相关转义问题.

```latex
\begin{equation}[htbp]
E = mc^2
\end{equation}
```

## 内联作用域

上面的描述其实都属于预处理阶段。但如果后端返回的数据非常“奇葩”，比如：

- 内联换行符；
- 方程组写法；
- 常见的 $ 没有转义；

那么单靠正则解析就会显得非常脆弱。一方面，正则的代价很高，我们需要在预处理中替换大量字符串；另一方面，这样得到的结果在用户手里可能就是一堆看不懂的残片，既不可维护，也难以扩展。

更合适的方案是**在内联粒度上做处理**：即以段落或列表为单位，把它们内部的 Text 节点统一收集，然后检测其中是否包含 LaTeX 片段。如果有，就把普通文本和公式分开“分堆”。

例如：遇到 $$，则先将前面的内容作为普通文本存储，再插入一条自定义的 inlineMath 节点，最后把尾部文本继续存进去。前提是你需要有一套自定义渲染模型，能够容纳这种“普通文本 + LaTeX”的混合节点结构。

换句话说，如果只是初学者会觉得这很简单；但真正做过 Markdown 定制的人都知道，这背后要拆成两大部分：**检测**和**分堆渲染**，实现难度并不小。

### 原文切片与纯净性

另一个棘手点是：**我们拿到的文本内容真的正确吗？**

cmark 的实现会自动对文本做转义处理，这意味着直接放进 LaTeX 的内容一定会被破坏。大部分情况下，你可能能通过把内容包裹为 inline code 或 HTML 来避免，但这次我们恰恰是希望缩小 LaTeX 的检测范围，所以不能再依赖这种“旁路”。

解决方案就是利用 **markup 提供的原始范围信息**。

Markdown 的 AST 中确实有 SourceRange，但它基于字符索引。如果直接用 String.count 对齐，很容易出现错位。安全的做法是：

1. 按照 UTF-8 offset 进行索引；
2. 在原始输入字符串上做切片；
3. 再把切片出来的内容当作 LaTeX 原文使用。

这样我们才能确保拿到的是真正的“原文”，而不是被转义或被修改后的结果。

# LaTeX渲染

当你获取到完整的LaTeX之后, 你会发现`swiftMath`的实现效果非常有限, 很多功能都没有支持, 但是也是理解必经想把LaTeX的所有case转换为iOS底层文本的实现是相当困难的. 那么它带来的好处是什么? 极快的渲染速度(1ms~3ms), 以及不用使用者操心的UI渲染效果. 但是问题就是有些少见的特性不支持, 而且我不知道是SwiftMath的翻译问题还是原本iOSMath这个库的实现问题, 如果你遇到了一些特别的语法他会直接crash... 没办法我们只能去寻找fallback方案. 去网上搜索已经会遇到这两兄弟 `KaTeX` 与 `MathJax`. 作者这对这两个库都进行了一些尝试.

## KaTeX

Khan Academy 开源的高性能 LaTeX 数学渲染库, 在网页端常作为 MathJax 的轻量替代. KaTeX的设计注重**速度**和**小体积**依然保持了良好的速度 。KaTeX 库本身压缩后约几百 KB，再加上一些字体资源，相较 MathJax 几兆的体积要轻量得多。描述的很好吧, 但是一切东西都是需要相应的代价的.

我们可以将 KaTeX 和 iOS 原生代码集成, 手动将 KaTeX 的 JavaScript源代码打包进项目，使用 `JavaScriptCore` 在后台执行 KaTeX 渲染，将 LaTeX 字符串转换为 HTML片段。KaTeX仅支持最后的输出是HTML代码内容, 所以我们需要在移动端渲染真正的HTML代码就是最大的实现问题. 能想到的解决办法基本上就是离屏渲染WKWebView, 然后获取视图截图并返回, 或者开WebView到Markdown的CollectionView中. 但是作者其实最终的期望就是获取到一个UIImage, 因为我还需要做文图混排相关的功能. 如果你想这个东西做好可能还需要维护WebView对象池, 加上性能考虑没有采用这个方案. 另外有一些细节需要考虑的是, 你无法找到官方对于iOS的版本封装, 需要手动导入源代码部分. 另外iOS确实有相关库实现了该功能, [KatexUtils](https://github.com/nks5117/KatexUtils). 但是该库已经不再维护使用的办法也基本是作者所描述的内容.

## MathJax

MathJax 是功能最完备的浏览器端 LaTeX/MathML 渲染引擎。为了提升在原生环境的性能，我们可以绕开 WebView，通过 JavaScriptCore 在后台运行 MathJax 的核心脚本，只执行公式到可视元素的转换，然后将结果绘制出来。社区已有开源项目 [MathJaxSwift](https://github.com/colinc86/MathJaxSwift) 实现了这一思路：它将 MathJax 3 的源码嵌入，使用 JavaScriptCore 执行，并提供 Swift 接口调用转换函数。MathJax 本身支持将 TeX 转换为多种输出格式，如 CommonHTML、MathML、SVG 。这样我们就可以避免使用WKWebView了, 甚至不管他是不是离屏的了.

然后如果你尝试调用相关代码, 你可以获取到对应 svg 的 xml 格式代码. 看吧问题来了吧, 目前iOS是肯定没有对应xml直接转换的库的, 如果你尝试 encode 到 data 然后直接扔到 UIImage 初始化方法里去一定是不支持的, 不是对你们说的是怕你们的AI会弱智到做这种操作. 所以我们的就到了下一部分 SVG

# 尝试SVG

这里其实应该是整体最耗时的地方, 因为 `KaTeX` 与 `MathJax` 的方案很常见, 网上也是一搜一大堆. 但是SVG真的就难了, 在近几年的XCode版本已经就支持Asset导入SVG相关资源了, 但是SVG的xml格式, 还是不支持的依然需要第三方库内容. `SVGKit` 、`SwiftSVG` 、`Macaw`. 效果均不尽人意, 最后再继续翻找的时候看到了 SwiftDraw, 进行尝试简单的API, 易用的写法, 一次尝试后效果就work. 真的让我一用就爱上, 主要他也不用强行绑定视图相关, 使用SVG相关类就可以. 于是我开始测试各种异常case, 当我以为一切都尘埃落定的时候, 发现了令人绝望的事情.

LaTeX是支持字体的, 但是我们主要的亚洲市场 `CJK Font` 全都展示不出来, 是乱码. 这时候我绝望了, 动摇了开始准备再次替换SVG库的想法. 但是其他家依然效果相当差, 就当我认为完了, 这个需求调研了一个星期多终将会以遗憾落幕的时候. 一个想法冒了出来, 我们能不能fork去检测如果是CJK字体的时候去做些什么? [Forked](https://github.com/Weixi779/SwiftDraw), 自己添加了对部分字体的检测, 不过由于是测试代码, 所以并没有向原repo提起PR, 后续作者找时间会整理这个Fork库的代码处理内容, 如果当你们点不开这个链接的时候我相信应该是被merge了.

# 额外需求

每次LaTeX变为图片的渲染需求太重了, 如存在AI深度思考的部分, 只是想将LaTeX基本上转为人能看懂的文字即可, 也方便整体的效果排版. 作者写了一个[开源库](https://github.com/Weixi779/LaTeX2Text-Swift), 可供参考与使用, 也欢迎大家提PR. 

# 总结补充

关于兜底效果: swiftMath最后直出的太好了, 我们使用 MathJax + SwiftDraw 也只是尽可能地将最终的效果往 swiftMath 那边靠拢. 不过我作为开发者基本上知道哪些内容支持哪些内容不支持都能进行一些区别, 但是实际上的用户我想应该是很难区分最终的图片效果. 

关于渲染时间: swiftMath 转图片的耗时平均大概在 4ms左右, MathJax + SwiftDraw 大概在 8ms左右, 不同机型肯定也是有区别, 作者仅在这里提供耗时时长对比仅作参考. 虽然微乎其微, 但是我避免这种时长累加过多我做了一层Cache, 尽可能地优化第二次的加载速度.

关于图片处理: SVG转图片直接拿是效果不好的, 我们需要给一个放大倍数, 毕竟我们的计算系数与JS直出的的效果不一样. 另外 `SwiftDraw` 提供padding方法, 拿到的图片经过处理后效果会更好.

# 最后

特别感谢 [GMarkdown](https://github.com/GIKICoder/GMarkdown) 学习了相关LaTeX fallback思路, 受益良多. 一路心路历程走下来, 给我的感觉还是iOS社区的趋向逐渐势微, 现在看高赞老库基本上都不维护了, 而且老库的实现也逐渐脱离现在发展趋势了, 被逐渐淘汰我认为是必然的. 但是新的内容逐渐也不更新了很是遗憾, 更别说中文社区了. 期望能为开源社区送上微薄之力吧.

# 参考链接

* https://github.com/gonzalezreal/swift-markdown-ui
* https://github.com/swiftlang/swift-markdown
* https://github.com/christianselig/Markdownosaur
* https://github.com/mgriebling/SwiftMath
* https://github.com/nks5117/KatexUtils
* https://github.com/SVGKit/SVGKit
* https://github.com/mchoe/SwiftSVG
* https://github.com/exyte/Macaw
* https://github.com/swhitty/SwiftDraw
* https://github.com/GIKICoder/GMarkdown 
