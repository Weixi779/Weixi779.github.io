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

如果你真去翻移动端的 Markdown 库, 会发现“自带 LaTeX”基本是奢望——并不是大家不愿做，而是 CommonMark 的原生实现 cmark 天生就没把它当刚需。它的目标一直是「少即是多」，标准功能只有这些：

- 标题（#、## 等）
- 段落 / 换行
- 列表（有序 / 无序）
- 引用块（>）
- 代码块 / 行内代码
- 链接 / 图片
- 强调（*italic* / **bold**）
- 水平分割线（---）

剩下的表格 / 任务列表 / 删除线这些都是 GitHub 在 cmark-gfm 层加的扩展，LaTeX 更是完全没影，所以你在很多库里连表格都渲染不了也不奇怪——作者就是想保持语法轻量，没打算管一堆学术排版场景。

- 不支持表格
- 不支持任务列表（- [x]）
- 不支持脚注
- 更不用说数学公式（LaTeX）

另外 LaTeX 自己就有一堆写法：`$…$`、`$$…$$`、`\(...\)`、`\[...\]`、`\begin{equation}` / `\begin{align}`……美元符是 TeX 圈的习惯，AMS 推荐反斜杠括号，环境语法才是“正规军”。不同解析器默认支持的集合都不一样，你指望开源库把全部分支兜住基本等于让它重写一套 TeX。也正因为此，iOS 大多还是落在 Swift-Markdown 这条官方链路上，想扩展就必须自己补齐缺失的那一截。

## swift-markdown架构

知道 CommonMark 不管 LaTeX 之后，问题自然砸回我们头上：想用 `$...$` 自定义语法是不是 fork 一下官方库就行？我也是这么想的，直到顺着源码链路往下翻，发现根本不是“一个仓库”的事。

> swift-markdown → swift-cmark → cmark-gfm → commonmark/cmark
>
> * swift-markdown: 只是 Swift wrapper 和 AST 建模层, 它自己并不做解析逻辑, 靠 swift-cmark 提供的 C 接口
> * swift-cmark:  就是个 Swift <-> C 的桥接, 它也不做解析, 只是把底层 cmark AST 映射到 Swift
> * cmark-gfm: 真正的解析器, GitHub 在这里加了表格 / 删除线 / task list 之类扩展, 所以我们如果自定义解析内容要在这里处理
> * cmark: CommonMark 的官方参考实现，功能最纯净

理论上只要动 cmark-gfm，但在 SwiftPM 里意味着你要维护三层 fork，还得跟进上游的 ABI 变动、重新生成桥接头文件。折腾半天只是为了认一个 `$`，投入产出比直接爆炸，于是我放弃“改底层”这条路，转而在 swift-markdown 之上做预处理+解析结果的二次加工。

# 内容提取

## 初步问题

swift-markdown 给了我们 `BlockDirective`、`InlineAttributes` 这些扩展点，只要预处理得当理论上可以接入任何语法。但实践下来，简单示例都能过，复杂 LaTeX 一夜之间全失灵，尤其是成对大括号、环境语法彻底把默认解析器炸穿。

```latex
\\begin{cases}
\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0} \\\\
\\nabla \\cdot \\vec{B} = 0
\\end{cases}
```

上面这种方程组是最典型的反例。`BlockDirective` 的语法是 `@Keyword { ... }`，一旦内容里再嵌套大括号就直接对不上。我给官方提了一个 [issue](https://github.com/swiftlang/swift-markdown/issues/236)，目前还没人接。最后只能把块级公式在预处理阶段替换为 `<LaTeX>...</LaTeX>`，让它走 HTMLBlock 通道：语义得以保留，但代价是要自己控制换行、正则摘取内容、再把文本塞回 AST。

`InlineAttributes` 同样不靠谱。它需要 `^[content](Keyword)` 这种包裹方式，LaTeX 内嵌 `[]` 的概率虽然不算大，但谁敢保证后端不会给你一个 `\begin{equation}[htbp]`？我的处理方式是直接把原始内容包一层 `` `content` `` inline code，先保命，再在后续阶段自己拆。

```latex
\begin{equation}[htbp]
E = mc^2
\end{equation}
```

## 内联作用域

块级问题解决了，内联才是真正的噩梦：后端随时可能给你

- 半截 `$` 没闭合；
- 把 `\\` 当换行；
- 一句话里夹了多段公式，甚至还跨行。

你要是指望预处理阶段用一堆正则硬怼，执行成本高不说，出了问题连定位都难。我的做法是直接把解析后的 Text 节点再过一遍，把它们拆成“普通文本 + LaTeX token”的数组：每遇到 `$...$` 就把前面缓存的文字 flush，插入一个自定义 `inlineMath`，然后继续往后扫。这样能保证渲染层拿到的结构是明确的，虽然实现上要自己维护检测器和拆分逻辑，但至少不会在 UI 层炸锅。

### 原文切片与纯净性

还有个坑经常被忽略：swift-markdown 返回的 Text.string 已经被转义，`\$` 会变成 `$`，`\{` 会变 `{`，如果直接把它当 LaTeX 渲染，结果一定错。只能利用 AST 上的 `SourceRange` 重新到原文里切片：

1. 预处理阶段记录整份 Markdown 的 UTF-8 行首偏移；
2. `SourceLocation`（行列）转成全局 offset；
3. 在原字符串的 utf8 视图里切片，得到未转义的子串。

这样我们才能确保拿到真正的“原文”，再配合上面的内联拆分，公式检测才有意义。

# LaTeX渲染

拿到干净的 LaTeX 字符串后，渲染链路的第一选择仍然是 SwiftMath。它底层沿用 iOSMath 的 `MTMathUILabel`，只要语法能识别，1~4ms 内就能拿到一张渲染良好的图片，完全不用操心字体/布局。但问题也明显：语法覆盖远不如 MathJax/KaTeX，某些命令（例如 `\quad`、部分堆叠符号）会直接 crash，而且它必须在主线程跑。为了兼顾速度与稳定性，我最后做了一个“优先 SwiftMath、失败再 fallback”的策略，后面的双引擎就围绕这个思路展开。

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
