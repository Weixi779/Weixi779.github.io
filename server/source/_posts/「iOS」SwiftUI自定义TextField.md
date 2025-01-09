---
title: 「iOS」SwiftUI自定义TextField
catalog: true
top: false
mathjax: true
date: 2024-08-18 14:59:38
summary:
tags: [SwiftUI, 技巧]
categories: [iOS]
---

# 背景

TextField, 作为移动端最常用的输入方式之一, 会非常频繁的出现在各类APP之中, SwiftUI 也提供了类似的组件, 但是真好用吗, 网上的教程真的够多吗? 客制化能力, 拼音长度限制 到底怎么写? 这篇文章作者会对近期的踩的TextField小坑做一个简单的总结.

# 苦衷

TextField 在 swiftUI 中的 API 非常之少, 基本只还保持的最初的API, iOS 15 对其焦点部分进行了一下更新, 但是对客制化能力基本聊胜于无.

首先聊聊文本长度限制的问题,  对于 TextField来讲, 没有内置的 API, 基本都是依赖 Combine 框架中的回调 `onReceive` 或者 `onChange`

```swift
// onReceive
TextField("", text: $text)
    .onReceive(Just(text)) { newValue in
				if newValue.count > 10 {
						text = String(newValue.prefix(10))
				}
		}
    
// onChange
TextField("", text: $text)
		.onChange(of: text) { oldValue, newValue in
				if text.count > 10 {
						text = String(text.prefix(10))
				}
		}

// binding 国外一个大哥写的 目前用起来是最简洁的
TextField("", text: $text.limit(10))
extension Binding where Value == String {
    func limit(_ limit: Int) -> Self {
        if self.wrappedValue.count > limit {
            DispatchQueue.main.async {
                self.wrappedValue = String(self.wrappedValue.dropLast()) // 这里用啥都一样没啥区别的
            }
        }
        return self
    }
}
```

这样写能够完成需求, 但是会有两个问题

1. 这两种回调方式可能会循环调用, 在回调中更新相关值会再次调用相关回调. 故一定要写关于数量的判断.
2. 相信开发的UIKit的同学已经发现到问题了, 不过光是 拼音输入, 亚太地区的音节输入法都会遇到选中范围然后直接被截断的问题, 输入体验会相当不好.

那么这种两个方法怎么处理呢?

首先关于第一点, 如果输入框只是纯数字/密码输入, 那么可以直接用, 大概率不会有太大的限制.

只要是第二点, 在目前SwiftUI 提供的能力下无解, 如果SwiftUI 无解 那么 后面做什么大伙已经很明朗了.

# 桥接

桥接View基本就是两部分内容, 写 `Coordinator` 跟 `Representable`

## Coordinator 部分

```swift
final class PTextFieldCoordinator: NSObject, UITextFieldDelegate {
    var control: PTextField
    
    init(_ control: PTextField) {
        self.control = control
        super.init()
        control.textField.addTarget(self, action: #selector(textFieldEditingDidBegin(_:)), for: .editingDidBegin)
        control.textField.addTarget(self, action: #selector(textFieldEditingDidEnd(_:)), for: .editingDidEnd)
        control.textField.addTarget(self, action: #selector(textFieldEditingChanged(_:)), for: .editingChanged)
        control.textField.addTarget(self, action: #selector(textFieldEditingDidEndOnExit(_:)), for: .editingDidEndOnExit)
    }
 
    @objc private func textFieldEditingDidBegin(_ textField: UITextField) {
        control.onEditingChanged(true)
    }
 
    @objc private func textFieldEditingDidEnd(_ textField: UITextField) {
        control.onEditingChanged(false)
    }
 
    @objc private func textFieldEditingChanged(_ textField: UITextField) {
        // 选中状态忽略变化
        if let selectedRange = textField.markedTextRange,
           let _ = textField.position(from: selectedRange.start, offset: 0) {
            return
        }
        // 若有长度限制检查
        if let characterLimit = control.characterLimit, let text = textField.text {
            if text.count > characterLimit {
                textField.text = String(text.prefix(characterLimit))
            }
        }
        control.text = textField.text ?? ""
    }
 
    @objc private func textFieldEditingDidEndOnExit(_ textField: UITextField) {
        control.onCommit()
    }
    
    @objc func clearText() {
        control.text = ""
    }
}
```

这部分是在 UIKit 就会做的一些基本内容, 封装出对应方法 通知桥接视图, 然后在editingChanged回调中就可以完成拼音的不限制拼音的相关能力.

## Representable 部分

恶心的是这部分内容, 虽然想法是UITextField 桥接成 TextField, 但是实际上并不是, 相当于创造了一个新的SwiftUI View 视图, 那么对应的回调, 标题字体、大小、颜色这些能力都需要自己重新写一遍, 封出对应的API.

自定义组件肯定是希望相关API 封装的越足越好, 所以写自定义代码一下子对应代码量就上来了, 但这完全做的是杂活, 与 SwiftUI 简洁背道而驰, 但你又没什么办法, 这就是 SwiftUI.

```swift
struct PTextField: UIViewRepresentable {
    private let placeholder: String?
    @Binding var text: String
    let textField = UITextField()
    
    let onEditingChanged: (Bool) -> Void
    let onCommit: () -> Void
    
    private var keyboardType: UIKeyboardType = .default
    private var rightViewMode: UITextField.ViewMode = .whileEditing
    
    var characterLimit: Int?
    private var font: UIFont?
    private var textColor: UIColor?
    private var returnKeyType: UIReturnKeyType?
 
    init(_ placeholder: String?,
         text: Binding<String>,
         characterLimit: Int? = nil,
         onEditingChanged: @escaping (Bool) -> Void = { _ in },
         onCommit: @escaping () -> Void = {}
    ) {
        self.placeholder = placeholder
        self._text = text
        self.characterLimit = characterLimit
        self.onEditingChanged = onEditingChanged
        self.onCommit = onCommit
    }
 
    func makeCoordinator() -> PTextFieldCoordinator {
        PTextFieldCoordinator(self)
    }
 
    func makeUIView(context: Context) -> UITextField {
        textField.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
 
        textField.placeholder = placeholder
        textField.delegate = context.coordinator
        textField.keyboardType = keyboardType
        // clearButton
        textField.rightView = customClearButton(context: context)
        textField.rightViewMode = rightViewMode
        
        // Apply SwiftUI modifiers
        if let font = font {
            textField.font = font
        }
        if let textColor = textColor {
            textField.textColor = textColor
        }
        if let returnKeyType = returnKeyType {
            textField.returnKeyType = returnKeyType
        }
        
        return textField
    }
 
    // NOTE: 当 @Binding 的值被更改时，会调用 updateUIView 方法
    func updateUIView(_ uiView: UITextField, context: Context) {
        // NOTE: 只有在没有转换候选项时 (markedTextRange == nil) 才设置文本。
        // 如果没有这个条件，用户输入的第一个字符有时不会成为转换对象。
        if uiView.text != text && uiView.markedTextRange == nil {
            uiView.text = text
        }
        
        // Apply SwiftUI modifiers
        if let font = font {
            uiView.font = font
        }
        if let textColor = textColor {
            uiView.textColor = textColor
        }
        if let returnKeyType = returnKeyType {
            uiView.returnKeyType = returnKeyType
        }
    }
    
    private func customClearButton(context: Context) -> UIButton {
        let clearButton = UIButton(type: .custom)
        clearButton.setImage(UIImage(named: "InputFieldClearButton"), for: .normal)
        clearButton.addTarget(context.coordinator, action: #selector(context.coordinato.clearText), for: .touchUpInside)
        return clearButton
    }
}

extension PTextField {
    func keyboardType(_ keyboardType: UIKeyboardType) -> PTextField {
        var view = self
        view.keyboardType = keyboardType
        return view
    }
 
    func rightViewMode(_ rightViewMode: UITextField.ViewMode) -> PTextField {
        var view = self
        view.rightViewMode = rightViewMode
        return view
    }
    
    func inputLimit(_ limit: Int?) -> PTextField {
        var view = self
        view.characterLimit = limit
        return view
    }
    
    func font(_ font: UIFont) -> PTextField {
        var view = self
        view.font = font
        return view
    }
    
    func textColor(_ color: UIColor) -> PTextField {
        var view = self
        view.textColor = color
        return view
    }
    
    func returnKeyType(_ label: UIReturnKeyType) -> PTextField {
        var view = self
        view.returnKeyType = label
        return view
    }
}
```

目前作者只封装了 onEditingChanged 跟 onCommit 这两个回调, 仅对目前的需求看来是OK的, 后续依然有相关扩展的需要. 所以也不建议各位开发者引入对应Package, 够用够写就行足矣.

# 尾语

TextField 是大部分开发者都会遇到的问题, 但是在网上相关搜索都没有对应的解决方法, 或者是 SwiftUI 使用面太小 也许可能是 国内iOS开发已死, 最终这篇是在日本网友的论坛找到的类似问题答案.

还有一些禁止输入Emoji 或者 Emoji 换算字符的内容, 这些都直接搜索 UIKit 就行 一搜一大堆, 在这里就不做展开了, 愿有所收获, 祝各位 Coder Happy Coding.

