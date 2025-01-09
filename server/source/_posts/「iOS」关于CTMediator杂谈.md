---
title: 「iOS」关于CTMediator杂谈
catalog: true
top: false
cover: false
toc: true
mathjax: true
date: 2023-06-18 16:39:29
password:
summary:
tags: [变迁, 总结]
categories: [iOS]
---
# 一、组件化架构

## 1.1 业界风向

随着团队规模和应用版本的不断增长，项目的代码量也会不断膨胀，背负着越来越沉重的历史包袱。17、18年问题集中爆发了起来，在大厂号召下iOS开发领域掀起了一股“组件化”热潮。组件化是一种常见的应用架构设计，旨在提高代码的可重用性、可维护性和可扩展性，让并行开发更加高效。因此，越来越多的公司开始推行组件化架构，通过解耦和重组组件来提高开发效率。

> * 美团平台与点评平台，自2015年底合并以来，为了共建和沉淀公共服务，减少重复造轮子，提升研发效率，着手组建化架构[^1]
> * 2015年6月到年底，滴滴进行代号为 **The One** 的组件化框架开发，为了实现“代码治理”，可以“分而治之”的目标，在各个业务线各自开发的情况下防止代码大面积腐化，方便未来再做更加细致的架构重构，采用CocoaPods的方式进行拆分[^2]
> * 京东的 iOS 客户端从 2011 年 2 月发布至今已历经 6 年 + 的时间，研发团队也从最终的几个人变成了 N 多人，业务的复杂度早已不可想象。 iOS 组件化的目的从业务层面来讲主要是为了解决：多业务的并行集成，多部门的业务输出[^3]

## 1.2 认清现实

但是很可惜，世界上并不会存在什么万能药。目前组件化的主流方法基本为主工程使用 CocoaPods 工具把各个子库的版本号聚合起来。以达到组件化架构的目的，但是组件之间的 Podfile 相互显式依赖，以及各种联合发版等问题，并不是一个小工作量。

实现组件化架构的基本前提是具备一整套工具链来支持版本控制和集成。然而，维护这些工具链需要消耗大量的人力和物力。盲目地实施组件化架构可能并不能显著提高工作效率，甚至可能适得其反。

## 1.3 CTMediator

CTMediator是由casatway大神发布的一款开源第三方框架，其框架的根本目的就是组件化架构。旨在通过利用RunTime特性进行解析URLRouter来实现iOS应用程序的解耦。

然而，无论是否进行组件化，解耦和重组组件的思想始终是一致的。CTMediator这款仅300多行代码的第三方库，作为一种开发思想的实现工具，仍然具有介绍与学习的意义。

# 二、两个错误

CTMediator框架的诞生初衷源自作者对其他项目组件化中存在错误的思考[^4]。在这篇文章中，作者指出了他人项目组件化中的两个错误，阐述了理想中的项目组件化形态，并介绍了CTMediator框架的使用方法。

本文也会从这两个问题出发，围绕其错误原因进行讨论，再到CTMediator框架如何解决展开介绍。

## 2.1 路由注册

### 2.1.1 问题描述

> App启动时实例化各组件模块，然后这些组件向ModuleManager注册Url，有些时候不需要实例化，使用class注册

在路由设计中，常见问题之一是单例模式导致的代码冗余和维护成本的增加。无论是注册可跳转的URL还是Class，都会在单例中进行内存常驻，这会导致代码冗余，增加维护成本。

### 2.1.2 注册方案

但实际上对于Objective-C来讲 如果足够熟悉其特性就会一下子想到Runtime。

在CTMediator声明了一个对外方法performTarget。

本函数为该库的核心内容 主要功能为实例化Target并执行相关Action

```objective-c
- (id)performTarget:(NSString *)targetName action:(NSString *)actionName params:(NSDictionary *)params shouldCacheTarget:(BOOL)shouldCacheTarget
```

* 通过targetName拼接已经定义的NSObject名称(Target_targetName)
* 若已缓存从字典中拿取 未缓存直接通过 `NSClassFromString`创建NSObject
* 通过actionString拼接需要执行的函数名称后 通过 `NSSelectorFromString`创建SEL对象(Action_actionName)
* 判断是否需要缓存则加入Cached字典
* 对象若有该方法直接执行 如果没有该方法 直接走notFound方法

除此之外还支持Swift桥接后NSObject调用 如果响应者是Swift对象 则需要在参数字典中添加[kCTMediatorParamsKeySwiftTargetModuleName:"module_name"]对应名称,以支持runtime调度

## 2.2 远端与本地

> 当组件A需要调用组件B时，向ModuleManager传递URL，参数跟随URL以GET方式传递，类似openURL。然后由ModuleManager负责调度组件B，最后完成任务。

实际上，我相信聪明的读者已经注意到了一个问题。我们在2.1中讨论的runtime已不再仅限于URL和params的形式。CTMediator框架的核心思想是将远程和本地调用分离，这样我们才有机会在没有注册的情况下使用runtime特性调用相关方法。

主要不使用URL进行本地组件调用主要两个原因:

1. 远端APP调用处理是一定会走SchemeURL处理流程,使用URL的方式就会遇到许多参数问题,如果其中包括非常规参数那么则无法使用
2. 架构师没有充要条件可以相信 `未来产品`的演进中在对于远端APP调用与本地APP调用效果是一致的

### 2.2.1 URL之殇

针对当前移动端项目而言，使用 URL 进行远程唤起 APP 是一种常见的方式，不论是 Universal Links 还是 URL Scheme，都需要对 URL 进行解析。然而，这种方式存在一些隐患点。

首先，以 URL 为媒介进行信息传输只能传递非常规参数，如 UIView、UIImage 等无法被传递，因为只能传递可以被 JSON 序列化的参数。尽管当前项目并非组件化架构，有些 ViewController 的初始化也能够代替其功能。但考虑到 CTMediator 是以组件化为目标建立的框架，一些参数无法跨组件传输，这可能会成为一个自断后路的痛点。

另一个问题是 URL 中 Params 的传递问题。如果需求复杂度较高，URL 的长度和可读性都会下降。此外，这些参数没有文档或注释，不清楚业务逻辑的工程师进行调用可能会导致混乱。

### 2.2.2 远端调用方案

虽然URL目前有缺陷,可惜没有基本能够替代的方案,CTMediator也是提供了远端调用的函数

performActionWithUrl针对URLScheme进行解析、调用、执行 基本的URL解析并没有太多内容

```objective-c
- (id)performActionWithUrl:(NSURL *)url completion:(void (^)(NSDictionary *))completion
```

* 将传入的URL参数转化为URLComponents
* 将URL的queryItems逐个加入到params字典中
* 安全检查path中是否包括"native"字段
* 将URL中的host、path和params数组传入performTarget方法
* 判断performTarget结果执行completion回调

其中方法实现也是表明 `远程App调用`时的上下文环境以及功能是 `本地组件间调用`时上下文环境以及功能的 `子集`。这个逻辑注定了必须由本地组件间调用来为远程App调用来提供服务，逻辑上子集为父集提供服务说不通。

### 2.2.3 本地调用方案

在讨论完远端 URL 调用的问题后，我们来看一下本地调用应该如何实现。在 2.1.2 中，我们已经对 CTMediator 进行了一些讨论。CTMediator 的思想是为每个独立的业务模块建立一个独立的 `Target_业务模块`，然后为每个业务内容建立一个 `Action_业务内容`。随后，CTMediator 可以作为一个单例进行类别扩展，以实现每种业务的分发。

下面是一段官方用例:

Target声明

```objective-c
@implementation Target_A
- (UIViewController *)Action_ViewController:(NSDictionary *)params {
	 	typedef void (^CallbackType)(NSString *);
    CallbackType callback = params[@"callback"];
    if (callback) {
        callback(@"success");
    }
    AViewController *viewController = [[AViewController alloc] init];
    return viewController;
}
@end
```

CTMediator category 扩展

```objective-c
@interface CTMediator (A)
- (UIViewController *)A_ViewController:(void(^)(NSString *result))callback;
@end
```

```objective-c
@implementation CTMediator (A)
- (UIViewController *)A_ViewController:(void (^)(NSString *))callback {
    NSMutableDictionary *params = [[NSMutableDictionary alloc] init];
    params[@"callback"] = callback;
    return [self performTarget:@"A" action:@"Category_ViewController" params:params shouldCacheTarget:NO];
}
@end
```

调用方

```objective-c
UIViewController *viewController = [[CTMediator sharedInstance] A_ViewController:^(NSString *result) {
	NSLog(@"%@", result);
}];
[self.navigationController pushViewController:viewController animated:YES];
```

### 2.2.4 为什么是category

- category本身就是一种组合模式，根据不同的分类提供不同的方法，此时每一个组件就是一个分类，因此把每个组件可以支持的调用用category封装是很合理的。
- 在category的方法中可以做到参数的验证，在架构中对于保证参数安全是很有必要的。当参数不对时，category就提供了补救的入口。
- category可以很轻松地做请求转发，如果不采用category，请求转发逻辑就非常难做了。
- category统一了所有的组件间调用入口，因此无论是在调试还是源码阅读上，都为工程师提供了极大的方便。
- 由于category统一了所有的调用入口，使得在跨模块调用时，对于param的hardcode在整个App中的作用域仅存在于category中，在这种场景下的hardcode就已经变成和调用宏或者调用声明没有任何区别了，因此是可以接受的。

# 三、 尾语

iOS开发一直在不断发展，随着Swift + SPM的逐渐普及，Objective-C + Pod的方式将逐渐被取代。同时，随着语言的从动态到静态的转变，纯Swift工程将来可能不再需要使用Runtime特性。相应地，现在CTMediator的组件化架构思路也可能会不再适用。

但无论实现方式发生多大的变化，处理组件化问题的思路将是类似的。随着技术的不断更新，我们需要不断地学习和适应新的变化。感谢您阅读到这里，希望本文能够为您提供帮助。

# 参考链接

[casatwy/CTMediator: The mediator with no regist process to split your iOS Project into multiple project](https://github.com/casatwy/CTMediator)

[iOS应用架构谈 组件化方案](https://casatwy.com/iOS-Modulization.html)

[去model化和数据对象 - Casa Taloyum ](https://casatwy.com/OOP_nomodel.html)

[CTMediator的Swift应用  - Casa Taloyum ](https://casatwy.com/CTMediator_in_Swift.html)

[从预编译的角度理解Swift与Objective-C及混编机制 - 美团技术团队](https://tech.meituan.com/2021/02/25/swift-objective-c.html)

[Category 特性在 iOS 组件化中的应用与管控 - 美团技术团队](https://tech.meituan.com/2018/11/08/ios-category-module-communicate.html)

《设计模式-可复用面向对象软件的基础》

[^1]: [美团外卖iOS多端复用的推动、支撑与思考 - 美团技术团队](https://tech.meituan.com/2018/06/29/ios-multiterminal-reuse.html)

[^2]: [滴滴出行 iOS 客户端架构演进之路 - 掘金](https://juejin.cn/post/6844903428297080846)

[^3]: [京东iOS客户端组件管理实践_iOS_孙达威_InfoQ精选文章](https://www.infoq.cn/article/jd-ios-component-management)

[^4]: [在现有工程中实施基于CTMediator的组件化方案  - Casa Taloyum ](https://casatwy.com/modulization_in_action.html)
