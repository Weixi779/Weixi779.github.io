---
title: 「iOS」自定义TabView
catalog: true
top: false
mathjax: true
date: 2024-07-29 13:15:07
summary:
tags: [SwiftUI, 技巧]
categories: [iOS]
---

> 2025.05.25 更新 添加新内容 优化整体思路

# 概述

TabView 是在 SwiftUI 1.0 就引入的 View, 作为移动端的老牌设计风格, 在之后2.0有了一些新API之后, 基本没有API的大变动, 所以这个组件设计的还是算是比较成功的, 不过一些其他功能方面的API变更, 也会或多或少的稍微印象TabView的相关封装.

下文将基于iOS16+, 对TabView进行二次封装使其能够支持完全自定义的底部效果展示以及一些扩展思路的想法.

# 初见

TabView正常使用来讲非常简单, 网上也是很多教程, 你可以直接写下类似这样内容.

```swift
struct ContentView: View {
    @State var selection = 1

    var body: some View {

        TabView(selection: $selection) {

            PageOneView()
                .tabItem {
                    Label("Page1", systemImage: "1.circle")
                }
                .tag(1)

            PageTwoView()
                .tabItem {
                    Label("Page2", systemImage: "2.circle")
                }
                .tag(2)

            PageThreeView()
                .tabItem {
                    Label("Page3", systemImage: "3.circle")
                }
                .tag(3)
        }
    }
}
```

之后TabView就会跃然纸上, 但是客制化能力不足. 对外的简单调用带来了痛苦的自定义成本, 作者接收到的需求时需要自定义的红点样式 与 不规则底部导航栏UI.

# 设计

通过调研与测试基本上得出了比较合理的能够完全自定TabView的方案, 即使用官方TabView管理页面切换与生命周期相关, 通过ZStack完全自定义UI样式. 这边设计思路为 MVVM 格式, 下面会详情说明各个内容设计.

## Model

### TabSection

`TabSection` 对应 `Section` 的静态配置, 定义了类型、标题、图片资源等等. 方便 switch case 的书写, 尽量让外部不会再调用相关判断,直接使用内部属性变量即可. 而这一层是专门给原生TabView使用的. 这里对AnyView进行了书写, 如果对视图有特别的性能要求, 可以考虑封装 ViewBuilder 进一步优化性能.

P.S. TabSection 会与 官方定义同名, 为避免可改名.

```swift
enum CTabSection: Identifiable, CaseIterable {
    case chats
    case contacts
    case me
    
    var id: Self { self }
    
    var title: String {
        switch self {
        case .chats: "聊天"
        case .contacts: "通讯录"
        case .me: "我的"
        }
    }

    var blankImage: String {
        switch self {
        case .chats: "message"
        case .contacts: "person.2"
        case .me: "person"
        }
    }

    var selectedImage: String {
        switch self {
        case .chats: "message.fill"
        case .contacts: "person.2.fill"
        case .me: "person.fill"
        }
    }
    
    var tagetView: AnyView {
        switch self {
        case .chats: return AnyView(Text("chats"))
        case .contacts: return AnyView(Text("contacts"))
        case .me: return AnyView(Text("me"))
        }
    }
}
```

目前其余代码

```swift
final class TabViewModel: ObservableObject {
    @Published var currentSection: CTabSection = .chats
}

struct CustomTabView: View {
    @StateObject var viewModel: TabViewModel = .init()
    
    var body: some View {
        TabView(selection: $viewModel.currentSection) {
            ForEach(CTabSection.allCases) { section in
                section.tagetView
            }
        }
    }
}
```

### TabItem

直到走到这里, 如果亲自测试代码, 可以看见空白的页面, 接下来就是这个自定义的精髓所在, 定义 `TabItem` 到这里才是我们视图真正的模型层.

```swift
struct TabItem: Identifiable {
    let id = UUID()
  
    let section: CTabSection
    var isSelected: Bool
//    var badgeCount: Int
    
    mutating func updateSelection(in section: CTabSection) {
        isSelected = self.section == section
    }
}

```

```swift
struct TabItemView: View {
    var item: TabItem
    var onTap: (CTabSection) -> Void
    
    var body: some View {
        ZStack {
            Color.white
            
            VStack {
                VStack(spacing: 4) {
                    VStack {
                        Image(systemName: displayImage)
                            .resizable()
                            .frame(width: 24, height: 24)
                    }
                    .frame(height: 32)
                    
                    Text(item.section.title)
                        .foregroundStyle(displayColor)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .onTapGesture {
            onTap(item.section)
        }
    }
    
    var displayImage: String {
        item.isSelected ? item.section.selectedImage : item.section.blankImage
    }
    
    var displayColor: Color {
        item.isSelected ? Color.red : Color.black
    }
}
```

## 整体视图

写到这里基本上聪明的小伙伴应该能理解出来, 我们这个是封装出来的完全自定义的UI效果, 作者随便写的UI效果没有那么好看, 代码也没有抽的特别干净, 仅仅做抛砖引玉的效果.

```swift
struct CustomTabView: View {
    @StateObject var viewModel: TabViewModel = .init()
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $viewModel.currentSection) {
                ForEach(CTabSection.allCases) { section in
                    section.tagetView
                }
            }
            
            ZStack(alignment: .top) {
                Color.white
                
                HStack(spacing: 0) {
                    ForEach(viewModel.items) { item in
                        TabItemView(item: item) { section in
                            viewModel.setCurrent(section: section)
                        }
                    }
                }
            }
            .frame(height: 108) // 这里可改为 safeAreaInsets + 对应高度
        }
        .edgesIgnoringSafeArea(.bottom)
     
    }
}
```

另一方面 viewModel这边.

```swift
final class TabViewModel: ObservableObject {
    @Published var currentSection: CTabSection = .chats
    @Published var items: [TabItem]
    
    init() {
        self.items = CTabSection.allCases.map { section in
            .init(section: section, isSelected: false)
        }
        self.updateSelectionStatus()
    }
    
    func setCurrent(section: CTabSection) {
        self.currentSection = section
        self.updateSelectionStatus()
    }
    
    func updateSelectionStatus() {
        for i in 0..<items.count {
            items[i].updateSelection(in: currentSection)
        }
    }
}
```

# 扩展

这样我们整体其实自定义视图的设计思路已经出来了, 由 TabSection 作为原装 TabView 相关内容的链接, 使用原生 SwiftUI 控制其生命周期的控制, 在对二次进行封装 TabItem 与 TabItemView 进行完全自定义的UI样式管理. 无论是红点逻辑, 更或者是换肤相关的控制, 将相关逻辑仍至 ViewModel 处理即可.

然后聊聊关于 TabView 的 其他设计理念, 一般来讲TabView 都是放置在首页面, 所以逻辑上他会放到特别前面的地方, 跟 APP启动流程 或者 主入口 相关. 那么这里就有两个方向去讨论.

## 路由

路由的注入时机应该与TabView的注入时机是同时的. 目前设计是单路由. 代码如下:

```swift
struct XXXAPPView: View {
    @StateObject var router: Router = .init
    @StateObject var tabViewModel: TabViewModel = .init()
    
    var body: some View {
        NavigationStack(path: $router.path) {
            CustomTabView(viewModel: tabViewModel)
        }
        .environmentObject(tabViewModel)
    }
}
```

## 事件流构建

因为在首页中传入的 tabViewModel 作为环境变量, 那么在单路由框架下, 所有视图都可以拿到该内容, 在其创建无论是SectionPublisher 或者 BadgeCountPublisher 都是非常简单的方案, 所以就可以避免写一个所谓的单例进行事件分发或者消息处理, 整个事件会更加清晰.

# 结语

以上就是对自定义的TabView一些基础封装, 对外部再度开发留了一些扩展或者优化空间, 不过相比许多 SwiftUI 一些老生常谈的痛点来讲, TabView 已经算是非常好的相关功能了. 在如果现如今5202年在新建项目建议也使用 SwiftUI 作为主要项目框架作为扩展了.
