---
title: 浅谈Swift模型解析
catalog: true
top: false
cover: false
toc: true
mathjax: true
date: 2024-01-24 15:15:22
password:
summary:
tags: [Swift, OC, 历史发展, 总结]
categories:
---

# 一、背景介绍

在移动应用开发领域，Android 和 iOS 构成了双分天下。

对于安卓开发者而言，Kotlin 可被视为 Java 的精神传承。Kotlin 在完全兼容 Java 的基础上，引入了众多现代语法和特性，从而使开发变得更为简洁高效。

然而，在 iOS 开发领域，情况略有不同。Swift 和 Objective-C 更像是逐渐演进的关系，前者在取代后者的过程中融合了传统与创新。

这种渐进替代的格局，使得新老两代开发思想之间产生了碰撞，对于 iOS 开发者而言，语言转变并非一帆风顺的过程。

# 二、发展历程

在 iOS 开发中，Objective-C 的运行时特性起到了至关重要的作用，它允许动态派发消息、动态添加方法、交换方法实现等强大的功能。这为 Objective-C 带来了灵活性和可扩展性，但同时也带来了一些潜在的问题和复杂性。

然而，在 Swift 中，为了追求更高的性能和更严格的类型安全性，设计者选择了将运行时特性大幅度减少。这使得 Swift 在编译时就能发现更多的错误，并且更加高效地执行代码。

虽然这为开发者带来了很多好处，但也意味着某些 Objective-C 中常见的动态特性在 Swift 中无法直接使用。

## 2.1 灵魂烙印

在 Swift 4.0 版本之前，iOS 开发者在处理 JSON 解析时仍延续着 Objective-C 时代的惯例，编写了许多不够符合 Swift 风格的代码。

通常的做法是使用 `JSONSerialization.jsonObject` 将 JSON 数据转换为 `[String: Any]` 类型的字典，然后通过对数据类型进行扩展，实现类似于 Objective-C 中的 `stringValue`、`intValue` 等方法，从而完成模型的解析。

尽管这种方法能够实现 JSON 解析，但它存在一些潜在问题。首先，将 JSON 转换为 `[String: Any]` 字典的做法缺乏具体类型信息，因此在访问具体值时必须进行类型转换，可能带来类型安全性和运行时错误的风险。

其次，通过属性扩展方法来处理 JSON 解析可能降低代码的可读性和维护性，因为无法直接了解属性的类型和结构。最后，同时还会需要确认模型具体类型，会编写不少重复垃圾代码。

许多第三方库基于上述流程诞生，并因其悠久历史而拥有众多星标。尽管它们在当下可能不再如此出色，但它们仍然承载着丰富的经验与资源。

* [SwiftyJSON - 22.1K star](https://github.com/SwiftyJSON/SwiftyJSON)
* [HandyJSON - 4.1K star](https://github.com/alibaba/HandyJSON)
* [KakaJSON - 1.1K star](https://github.com/kakaopensource/KakaJSON)

## 2.2  更Swifty

随着对 Swift 的深入理解，一些开发者逐渐倾向于使用运算符重载的封装方式，以替代之前类似 Objective-C 中的 xxValue 方法的编写方式。这种方法可能受到其他编程语言开发者的启发，同时也展现了 Swift 语言的多样灵活特性。

通过运算符重载，代码的可读性和简洁性得到了提升，使数据转换变得更加直观明了。通过对 Swift 原生类型进行运算符的定制，你能够实现类似于 `stringValue` 和 `intValue` 的功能，同时赋予你的代码更加优雅的外观。也使得确认模型具体类型时，会编写的垃圾代码相对减少。

（当然，这也有可能是受到其他编程语言开发者重载运算符的启发。）

代表第三方库为

* [ObjectMapper - 9.1k star](https://github.com/tristanhimmelman/ObjectMapper)
* [JSONHelper - 786 star](https://github.com/isair/JSONHelper)

# 三、官方出手

其实无论上述的哪种方法 都是对 `[String: Any]`的变体,这种Objective-C解析思路的变体,无论在Swift无论怎么改变都显得表达复杂,使用繁琐.

在Swift4.0的大版本中推出了 `Codable`、`JSONDecoder`和 `JSONEncoder`等方案,旨在解决以下问题

1. **简化数据序列化和反序列化：** 在开发中，我们经常需要将数据从一种格式转换为另一种格式，比如将对象转换为 JSON 格式，或者将 JSON 数据转换为对象。`Codable` 提供了一种简单的方式，通过使用 `JSONEncoder` 和 `JSONDecoder`，可以轻松地实现数据的编码和解码。
2. **避免手动解析和构建：** 在之前，进行数据的序列化和反序列化可能需要手动编写大量的解析和构建代码，特别是当数据结构复杂时。`Codable` 通过自动生成解析和构建代码，减少了手动操作的需求，从而降低了出错的可能性。
3. **提高可维护性：** `Codable` 使代码更加干净、紧凑，同时减少了处理数据转换时的重复性工作。这有助于提高代码的可读性和可维护性。
4. **嵌套模型数组解析：**当数组的成员也被标记 `Codable` 时不用添加额外代码即可完成解析工作

但很可惜如果官方的Codable真有这么好用就没有这篇文档了,天下就会一统了,也不会存在所谓的第三方库了

## 3.1 问题何在

让我们编写一个简单的演示来探讨一下 `Codable` 的使用和问题。

首先，我们定义了一个数据结构：

```swift
struct User: Codable {
    var id: String
    var name: String
    var isVIP: Bool
}
```

接着，我们构造一个 JSON 数据进行数据解析：

```swift
let json = #"{"id": "123", "name": "weixi", "isVIP": true}"#
let model = try JSONDecoder().decode(User.self, from: json.data(using: .utf8)!)
```

执行结果：

```swift
User(id: "123", name: "weixi", isVIP: true)
```

这个例子中，`Codable` 表现得非常出色，能够完美地完成数据解析任务。

### 3.1.1 数据映射

当然，上述情况只是 `Codable` 最理想的应用情况。现在，让我们修改一下 JSON 数据：

```swift
let json = #"{"id": "123", "name": "weixi", "isVIP": 0}"#
```

这是会直接崩溃Error

```swift
Fatal error: Error raised at top level: Swift.DecodingError.typeMismatch(Swift.Bool, Swift.DecodingError.Context(codingPath: [CodingKeys(stringValue: "isVIP", intValue: nil)], debugDescription: "Expected to decode Bool but found number instead.", underlyingError: nil))
```

这个问题出在 Swift 认为你提供的是布尔类型，期望使用 `true` 或 `false` 进行解析。

那么，我们作为解析方应该如何应对呢？

我们需要将布尔类型映射到整数类型，然后自己编写一个 getter 方法：

```swift
struct User: Codable {
    var id: String
    var name: String
    var isVIP: Int
  
    var isReallyVip: Bool {
        return isVIP == 1
    }
}
```

但是，如果后端提供的是字符串类型的 `"0"` 或 `"1"` 呢？是的，同样的操作也需要执行。

### 3.1.2 关于可选值

当我们修改 JSON，使其缺少 `isVIP` 字段时：

```swift
let json = #"{"id": "123", "name": "weixi"}"#
```

解析仍然会导致错误：

```swift
Fatal error: Error raised at top level: Swift.DecodingError.keyNotFound(CodingKeys(stringValue: "isVIP", intValue: nil), Swift.DecodingError.Context(codingPath: [], debugDescription: "No value associated with key CodingKeys(stringValue: \"isVIP\", intValue: nil) (\"isVIP\").", underlyingError: nil))
```

为了确保解析不会崩溃，我们尝试将 `Bool` 改为可选 `Bool?`：

```swift
struct User: Codable {
    var id: String
    var name: String
    var isVIP: Bool?
}
```

然而，这会导致解析后的结果如下：

```swift
User(id: "123", name: "weixi", isVIP: nil)
```

可选值会让外部使用变得非常繁琐，需要进行空判断或者使用 `?? false` 进行处理。

实际上，我们的需求很简单：当这个简单的布尔值为空时，我们希望默认设为 `false`，就像在 Objective-C 中使用 `boolValue` 一样。

尽管 `Codable` 支持这种操作，但我们的代码会变成这个样子：

```swift
struct User: Codable {
    var id: String
    var name: String
    var isVIP: Bool
  
    enum CodingKeys: String, CodingKey {
        case id, name, isVIP
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        isVIP = try container.decodeIfPresent(Bool.self, forKey: .isVIP) ?? false
    }
}
```

这不仅需要重写整个 `init(from decoder: Decoder)` 方法，还需要在里面重写其他属性的解析规则。这种做法不仅会影响解码效率，还会增加维护成本，特别是在模型不断扩展的情况下。

在这种情况下，考虑到 `Codable` 在动态类型转换和处理上可能会产生不成熟的问题，以及维护成本可能会更高，许多开发者可能更倾向于选择那些更为稳定且维护成本较低的第三方解析库。

## 3.2 Property Wrappers

Swift 5.1 版本引入了 Property Wrappers 特性，旨在更加深入地融合 SwiftUI 和 Combine 框架。

类似于 Java 的注解，属性包装器充当了强大的 getter 和 setter，但使用了官方提供的模板，结合 `@` 前缀，编译器会将相关逻辑嵌入到代码中。

简而言之，这个特性为 Swift 带来了类似注解的功能，同时还提供了更大的灵活性和类型安全性。

经过前面的案例分析，实际上 `Codable` 解析所需的是对于默认值或可空值的简单判空处理。在过去的这几年中，可以说 Swift 的解析相关特性经历了一次重要的调整和发展。参考链接中提供了关于 `Codable` 和 Property Wrappers 结合使用的一些资料，这里不再详细展开。

其中出现了一些将这些特性进行封装的库，虽然它们相对较新，因此星标数可能较少。然而，在我看来，这才是 Swift 解析特性真正的显现。其中，一些代表性的第三方库包括：

* [BetterCodable - 1.6k star](https://github.com/marksands/BetterCodable)
* [CodableWrappers - 435 star](https://github.com/GottaGetSwifty/CodableWrappers)
* [CodableWrapper - 178 star](https://github.com/winddpan/CodableWrapper)

# 四、使用教程

## 4.1 框架使用

这次选择的解析库是CodableWrapper,由于初版在20年提交,所以目前star数并不多,但横向对比其他两个三方库确实这个使用起来会更简单

```swift
import CodableWrapper

struct User: Codable {
    @Codec var id: String = ""
    @Codec var name: String = ""
    @Codec var isVIP: Bool = false
}
```

由于是内部写的getter和setter 所以要给予默认值,其他的均不需要任何改动

这样他就可以自动帮我们的修复3.1.1 和 3.1.2 中讨论的两个问题

```swift
let json = #"{"id": "123", "name": "weixi", "isVIP": 1}"#
let json = #"{"id": "123", "name": "weixi", "isVIP": "1"}"#

-- 执行结果 --

User(_id: 123, _name: weixi, _isVIP: true)
```

```swift
let json = #"{"id": "123", "name": "weixi"}"#

-- 执行结果 --

User(_id: 123, _name: weixi, _isVIP: false)
```

## 4.2 框架其他功能

### 4.2.1 重命名

```swift
struct User: Codable {
    @Codec var id: String = ""
    @Codec var name: String = ""
    @Codec("isVIP") var isVip: Bool = false
}

let json = #"{"id": "123", "name": "weixi", "isVIP": true}"#

-- 执行结果 -- 

User(_id: 123, _name: weixi, _isVip: true)
```

### 4.2.2 enum rawValue

```swift
enum Gender: String, Codable {
    case male = "male"
    case female = "female"
}

struct User: Codable {
    @Codec var id: String = ""
    @Codec var name: String = ""
    @Codec var isVIP: Bool = false
    @Codec var gender: Gender = .male
}

let json = #"{"id": "123", "name": "weixi", "isVIP": true, "gender": "female" }"#

-- 执行结果 -- 

User(_id: 123, _name: weixi, _isVIP: true, _gender: female)
```

# 五、论外

## 5.1 Codable解析模型数组

`Codable` 的优势在于其特定的模型类型指定，因此不需要任何额外的代码。只需确保子模型遵循 `Codable` 协议即可。

```swift
struct Title: Codable {
    var content: String
    var level: Int
}

struct User: Codable {
    var id: String
    var name: String
    var isVIP: Bool
    var titles: [Title]
}

// json 就不贴了
```

## 5.2 关于Any

在文章前部分，我主要对一些高星标解析库提出了一些批评。这是因为在 Swift 中，如果你试图声明一个 `Any` 类型并让它支持 `Codable` 协议，会发现无法顺利编译。Swift 作为一种强类型语言，对于 `Any` 这种不具体类型的使用是相当谨慎的。

实际上，许多情况下我们都会不得不在代码中频繁使用 `Any`，但这种做法常常是被 Swift 所不鼓励的。然而，现阶段只能采用老旧的 `JSONSerialization` 方式或者引入类似 `AnyCodable` 的库来应对这些情况。

## 5.3 关于速度

属性包装器的方案因为是硬编码肯定对速度有影响,所以在这里进行一些测试

```swift
struct User: Codable {
    var id: String
    var name: String
    var isVIP: Bool
}

let json = #"{"id": "123", "name": "weixi", "isVIP": true }"#
var result = [CFAbsoluteTime]()

for _ in 0..<10 {
    let start = CFAbsoluteTimeGetCurrent()
    let model = try JSONDecoder().decode(User.self, from: json.data(using: .utf8)!)
    let end = CFAbsoluteTimeGetCurrent()
    let time = (end - start) * 1000
    result.append(time)
}
let total = result.reduce(0) { $0 + $1 }
print(total / 10)

-- 执行结果 -- 

0.11391639709472656
```

```swift
struct User: Codable {
    @Codec var id: String = ""
    @Codec var name: String = ""
    @Codec var isVIP: Bool = false
}

// 其他代码同上
-- 执行结果 -- 

0.3190040588378906
```

正是如此，以上操作显然会对执行速度产生一定的影响。然而，对于实际的性能影响，很难直接从代码量级中得出准确的概念。为了更好地理解这种影响，我运行了一个 Objective-C 示例。

```objc
NSString *json = @"{\"id\": \"123\", \"name\": \"weixi\", \"isVIP\": true }";

NSMutableArray *array = [NSMutableArray new];
for (int i = 0; i < 10; i++) {
    CFAbsoluteTime start = CFAbsoluteTimeGetCurrent();
    [User mj_objectWithKeyValues:json];
    CFAbsoluteTime end = CFAbsoluteTimeGetCurrent();
    CFAbsoluteTime time = (end - start) * 1000;
    NSNumber *number = @(time);
    [array addObject:number];
}

NSNumber *total = @(0);
for (NSNumber *number in array) {
    total = @([total doubleValue] + [number doubleValue]);
}
NSLog(@"%f", [total doubleValue] / 10);

-- 执行结果 -- 

1.6741
```

## 5.4 关于模型层共用

随着我们的项目进入OC与Swift的并行开发阶段，我们正在逐步向Swift迁移。首先，我们选择从最基础的业务模型层开始。为了确保模型层的无缝对接，我们需要考虑如何使Swift模型适配MJExtension解析。

### 5.4.1 如何添加

若有模型需要被OC层解析时

1. 将其声明为Class，并继承自NSObject。
2. 在前缀处添加@objcMembers或@objc。

完成上述步骤并编译后，OC层即可使用mj_objectWithKeyValues进行解析。

解析嵌套组时会有出入,无法使用mj_objectClassInArray进行解析声明。

3. 需要定义mj_didConvertToObject进行额外数组解析

```swift
@objcMembers
class PhotoList: NSObject, Codable {
    @Codec var photos: [PhotoModel] = []
  
    override func mj_didConvertToObject(withKeyValues keyValues: [AnyHashable : Any]!) {
        let paraseArray = PhotoModel.mj_objectArray(withKeyValuesArray: photos)
        self.photos = (items as? [PhotoModel]) ?? []
    }
}
```

为了方便后续调用，为数组添加了一个扩展：

```swift
// MARK: - MJ解析扩展
extension Array where Element: NSObject {
    /// 解析嵌套模型数组
    mutating func paraseArray() {
        let paraseArray = Element.mj_objectArray(withKeyValuesArray: self)
        self = paraseArray as? [Element] ?? []
    }
}
```

### 5.4.2 讨论Swift中使用MJ

虽然上述方法在Swift中是可行的，但并不推荐这样做，原因如下：

1. 模型必须被定义为Class。
2. 一旦继承了NSObject，任何本地的修改都会导致重新编译桥接文件。
3. 使用Codable是一个更好、更快、更流畅的选择。
4. 仍然存在与桥接相关的问题。

总的来说，这只是为Swift化的底层搭建了一个初步的桥梁，但前路仍然漫长。

# 六、结语

随着时间的推移，人们对于Swift的理解变得更加深入，语法也在逐步优化。Swift模式解析的完善正在逐渐显现，尽管从未来的角度来看，官方尚未明确指定一套解决方案。我们期待随着时间的推进，能够找到一套足够完美且符合Swift风格的解决方案。

# 参考链接

[SwiftyJSON/SwiftyJSON: The better way to deal with JSON data in Swift. (github.com)](https://github.com/SwiftyJSON/SwiftyJSON)

[tristanhimmelman/ObjectMapper: Simple JSON Object mapping written in Swift (github.com)](https://github.com/tristanhimmelman/ObjectMapper)

[kakaopensource/KakaJSON: Fast conversion between JSON and model in Swift. (github.com)](https://github.com/kakaopensource/KakaJSON)

[tristanhimmelman/ObjectMapper: Simple JSON Object mapping written in Swift (github.com)](https://github.com/tristanhimmelman/ObjectMapper)

[isair/JSONHelper: ✌ Convert anything into anything in one operation; JSON data into class instances](https://github.com/isair/JSONHelper)

[关于Swift的Property Wrappers_李发展的博客-CSDN博客](https://blog.csdn.net/fzhlee/article/details/114298582)

[使用 Property Wrapper 为 Codable 解码设定默认值 | OneV&#39;s Den (onevcat.com)](https://onevcat.com/2020/11/codable-default/)

[不同角度看问题 - 从 Codable 到 Swift 元编程 | OneV&#39;s Den (onevcat.com)](https://onevcat.com/2018/03/swift-meta/)

[关于Codable协议处理数据实体属性缺省值问题 - 掘金 (juejin.cn)](https://juejin.cn/post/6958827378093064206)

[Properties | Documentation (swift.org)](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/properties/#Property-Wrappers)

[属性 – Swift 编程语言 (cnswift.org)](https://www.cnswift.org/properties)

[CoderMJLee/MJExtension: A fast, convenient and nonintrusive conversion framework between JSON and model. Your model class doesn&#39;t need to extend any base class. You don&#39;t need to modify any model file. (github.com)](https://github.com/CoderMJLee/MJExtension)

[MJExtension 使用OC和Swift - 简书 (jianshu.com)](https://www.jianshu.com/p/ab4fe7d2b7e2)
