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

# 概述

TabView 是在 SwiftUI 1.0 就引入的 View, 作为移动端的老牌设计风格, 之后基本没有API的大变动, 所以这个组件设计的还是算是比较成功的, 不过一些其他的API变更, 也会或多或少的稍微印象TabView的相关封装. 

下文将在iOS17的环境下对TabView进行一些自定义封装能够让其支持以下两点功能:

1. 支持选中与未选中图片替换
2. 关于红点的动态配置

# 方案

在SwiftUI中大体的设计方案都是类似MVVM形式, 本次也是选择这个默认方式. 例子用简单的微信页面: 会话、通讯录、我 这个三个Section进行举例.

## Model

### TabSection

这个地方是对文案、图片名称的基础配置, 方便 switch case 的书写, 尽量让外部不会再调用相关判断,直接使用内部属性变量即可.

```swift
enum TabSection {
    case chats
    case contacts
    case me
    
    var imageTitle: String {
        switch self {
        case .chats:
            return "聊天"
        case .contacts:
            return "通讯录"
        case .me:
            return "我的"
        }
    }

    var normalImage: String {
        switch self {
        case .chats:
            return "message"
        case .contacts:
            return "person.2"
        case .me:
            return "person"
        }
    }

    var selectedImage: String {
        switch self {
        case .chats:
            return "message.fill"
        case .contacts:
            return "person.2.fill"
        case .me:
            return "person.fill"
        }
    }
}
```

### TabItem

这个是TabView真正的模型层, 一些操作内容也需要放到这里进行

```swift
struct TabItem: Identifiable {
    let id = UUID()
    let section: TabSection
    var badgeCount: Int
    let view: AnyView
    
    public func imagePath(_ isSelected: Bool) -> String {
        return isSelected ? section.selectedImage : section.normalImage
    }
    
    public mutating func addBadgeCount(_ count: Int) {
        self.badgeCount += count
    }
    
    public mutating func clearBadgeCount() {
        self.badgeCount = 0
    }
}
```

## View

这是其实是对 .tabItem 的视图封装, 目前红点功能是用的TabView默认的badge, 虽然简单,足以够用, 如果在对UI效果有要求的可在 这个View中自行封装, 保留其扩展性.

```swift
struct TabItemView: View {
    let tabItem: TabItem
    let isSelected: Bool
    
    var body: some View {
        VStack {
            Image(systemName: tabItem.imagePath(isSelected))
            Text(tabItem.section.imageTitle)
        }
    }
}
```

通过上述内容的一顿封装, 外部的TabView相关调用已经相当简洁了

```swift
struct CustomTabView: View {
    var tabViewModel: TabViewModel
    
    var body: some View {
        TabView(selection: tabViewModel.sectionBinding) {
            ForEach(tabViewModel.items) { item in
                item.view
                    .tabItem { TabItemView(tabItem: item, isSelected: item.section == tabViewModel.tabSection) }
                    .badge(item.badgeCount)
                    .tag(item.section)
            }
        }
    }
}
```

## ViewModel

iOS 17 Observable 框架下不同的地方其实就在这里, 经过我的测试 `@Bindable` 不是那么好使, 在内部声明sectionBinding属性, 但其实这么比 确实 `$tabSection` 要简洁的多, 不过这么封装, 对内部的相关逻辑处理有了更好的帮助, 可以在set的时候多处理一些简单的事情.

另外由于是struct, 所以要对对应的数组的index做处理, 相信各位swifter已经非常熟悉了.

```swift
@Observable
class TabViewModel {
    public var tabSection: TabSection = .chats
    
    public var sectionBinding: Binding<TabSection> {
        Binding (
            get: { self.tabSection },
            set: { self.tabSection = $0 }
        )
    }
    
    public var items: [TabItem] = [
        TabItem(section: .chats, badgeCount: 0, view: AnyView(ChatsRootView())),
        TabItem(section: .contacts, badgeCount: 0, view: AnyView(ContactsRootView())),
        TabItem(section: .me, badgeCount: 0, view: AnyView(ProfileRootView()))
    ]
  
    private func index(for section: TabSection) -> Int? {
        return items.firstIndex(where: { $0.section == section })
    }
    
    public func addBadgeCount(_ section: TabSection, _ count: Int = 1) {
        if let index = index(for: section) {
            items[index].badgeCount += count
        }
    }
    
    public func clearBadgeCount(_ section: TabSection) {
        if let index = index(for: section) {
            items[index].badgeCount = 0
        }
    }
}
```

# 结语

以上就是对自定义的TabView一些简单的封装, 基础封装, 但是对外部再度开发留了一些优化空间, 由于这里只是TabView的部分, 所以对路由、换肤啥的没有提及.

感谢看到这里的各位, Happy Coding~.
