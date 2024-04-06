---
title: iOS震动与系统声音
catalog: true
top: false
cover: false
toc: true
mathjax: true
date: 2024-03-04 20:37:31
password:
summary:
tags: [原生,踩坑记录]
categories:
---

# iOS麦克风与系统声音

## 起因背景

产品需求游玩期间调用手动震动, Unity本内置振动的功能,

但效果太差, Android震动程度特别大, iOS没有震动,

就此提了一个需求编写原生iOS震动插件

## 过程

那这个流程就涉及到两个内容, Unity调用原生及原生调用震动

原生代码比较简单 `AudioServicesPlaySystemSound`即可

Unity桥接也是用了网上比较大众流程的 `Swift Package` -> `XCode` -> `Framework` 的流程

> 这种方法只能在低版本的MacOS系统上执行 我本人用老电脑(Catalina)进行测试

但进入声网频道后调用无效果, 便展开了调研

## 自我怀疑

由于新版本 `generate-xcodeproj`指令已被废弃, 加上传输文件并不方便, 就认为是个人Unity到iOS的桥接没有做好

于是用 Objective-C 通信 C 的方式进行处理, 但结果依然不行

深深的陷入了自我怀疑

便重新写了一个弹原生Alert的测试函数竟然成功了...

发现其实本身就不是流程问题, 而是播放系统音效的代码实现

## 播放调研

发现手机切后台后, 键盘输入也没有声音与震动, 经过查看 设置-声音与触感 一切正常

才恍然大悟这个需求的系统声音播放前提还有一个条件, 就是在声网频道里

经过关键字查询:

`AVAudioSession` 中有一个 `mode` 字段

为 `default` 时 震动不生效

为 `voiceChat` 时 才能够震动

```objectivec
+ (void)weakVibrate {
    // 只有在VoiceChat模式下 才能在使用麦克风时 调用系统声音
    if ([AVAudioSession sharedInstance].mode != AVAudioSessionModeVoiceChat) {
        NSError *error = nil;
        [[AVAudioSession sharedInstance] setMode:AVAudioSessionModeVoiceChat error:&error];
    }
    SystemSoundID soundID = 1521;
    AudioServicesPlaySystemSound(soundID);
}
```

目前看来 `default` 与 `voiceChat` 区别并不大

官方文档中也写的主要是优化语音质量

问题解决

## 参考链接

https://forums.swift.org/t/rfc-deprecating-generate-xcodeproj/42159

https://www.youtube.com/watch?v=DsKXNakuxsg

https://qiita.com/atsutama/items/3c8fe716c2667be6025f

https://zhuanlan.zhihu.com/p/655327051

https://www.jianshu.com/p/4e0f124a1ed4