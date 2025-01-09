---
title: 「Unity」沙盒建造游戏设计(1) - 相机控制
catalog: true
top: false
mathjax: true
date: 2024-04-14 19:58:43
summary:
tags: [技巧, 心得]
categories: [Unity]
---
## 前言

在近期的公司项目中，需求项目开发一个类沙盒建造功能。我有幸负责项目中的关键部分，这一经历充满了挑战与收获。鉴于这个部分内容的丰富性和技术性，我决定将涉及相关设计以及本人的一部分思绪分成四期内容。本文是系列文章的第一期，将重点讨论建造期间的相机控制功能。

本篇主要包括四个相机部分内容 `边界移动`、`单指拖拽` 与 `双指缩放` 以及 `状态控制`

## 边界移动

### 古法移动

最近有几期需求都是跟相机移动相关的, 之前的做法还是让相机Follow一个对象, 给对象设置移动边界从而限制照相机不会穿帮

能够实现需求但是效果不是那么好, 因为要绑定透明对象, 并给对象设置边界范围要做一系列prefab操作,不够直观.而且因为要设置物理碰撞相关内容更新是在FixedUpdate中执行

即使是这样 如果相机在超过了Border范围的情况下, Follow对象没有设置对应的碰撞范围依然可以移动, 那么下次往相反的方向移动, 会先还原超过的距离, 再根据边缘移动相机从而有延迟感, 并穿帮

那么为了避免这种情况的出现, 就得需要手机屏幕的长宽进行比例结算, 动态设置相机的正交距离, 从而保证限制Follow对象的移动范围对应比例每次都和相机的Border比例都正常

```lua
    self.xSize = Screen.width
    self.ySize = Screen.height
    local targetWidth = 2000 -- 特殊视角强制宽度为2000
    local screenRatio = Screen.width / Screen.height
    local targetRatioSize = targetWidth / screenRatio / 2 / 100
```

有点过于麻烦了

### 革新

又有一期关于照相机的需求 秉承着不能从同一个位置绊倒的想法 进行了一些调研

希望通过相机位置(Position), 正交距离(Orthographic Size), 显示区域(Border) 控制相机移动

目前来看是可以通过代码进行计算的

```lua
local function clamp(val, lower, upper)
    if lower > upper then
        lower, upper = upper, lower
    end
    return math.max(lower, math.min(upper, val))
end

function Camera:UpdatePositionInBound(deltaVector)
    local orthographicSize = self.virtual.m_Lens.OrthographicSize
    local heightHalf = orthographicSize
    local widthHalf = heightHalf * Aspect

    local minX = self.bounds.min.x + widthHalf
    local maxX = self.bounds.max.x - widthHalf
    local minY = self.bounds.min.y + heightHalf
    local maxY = self.bounds.max.y - heightHalf

    local targetPosition = self.transform.position - (deltaVector or Vector3(0, 0, 0))
    -- 调整位置以保持在边界内
    targetPosition.x = clamp(targetPosition.x, minX, maxX)
    targetPosition.y = clamp(targetPosition.y, minY, maxY)

    self.transform.position = Vector3(targetPosition.x, targetPosition.y, PositionZ)
end

function Camera:UpdateCameraOrthoSize(deltaSize)
    local targetSize = self.virtual.m_Lens.OrthographicSize + (deltaSize * ZoomSpeed)
    targetSize = clamp(targetSize, MinOrthoSize, MaxOrthoSize)
    self:SetOrthoSize(targetSize)
    self:UpdatePositionInBound()
end
```

代码大体是根据当前的正交大小与屏幕比例, 计算目前视野范围的最大最小值, 然后与每次更新deltaVector的位置进行比较, 最终得出下一次相机的Position

## 单指拖拽

最初做法是记录Begin位置, 然后拖拽时根据开始位置的坐标进行上下左右方向判断, 得出移动方向后用deltaTime * speed算出最总相机移动的距离

但实际上并不一样,整体效果应该是手指点击的位置, 上下左右相机跟随移动, 之后手指的位置依然是手指点击的位置, 所以关于单指拖拽需要用到屏幕坐标依靠相机转换为世界坐标移动向量

```lua
function CameraManager:DeltaScreenToWorldPoint(deltaScreenPoint)
    return self.camera:ScreenToWorldPoint(Vector3(deltaScreenPoint.x, deltaScreenPoint.y, self.camera.nearClipPlane)) -
        self.camera:ScreenToWorldPoint(Vector3(0, 0, self.camera.nearClipPlane))
end

function CameraInput:OneTouch()
    local touch = Input.GetTouch(0)
    self.deltaVector = CameraManager:DeltaScreenToWorldPoint(touch.deltaPosition)
end
```

## 双指缩放

缩放还是比较简单的 只是纯粹的计算 注意外面处理的时候好好调整速度即可

```lua
function CameraInput:TwoTouch()
    self.isZooming = true
    local touch1 = Input.GetTouch(0)
    local touch2 = Input.GetTouch(1)

    local deltaVector1 = touch1.position - touch1.deltaPosition
    local deltaVector2 = touch2.position - touch2.deltaPosition

    local startMagnitude = (touch1.position - touch2.position).magnitude
    local deltaMagnitude = (deltaVector1 - deltaVector2).magnitude

    self.zoomMagnitude = deltaMagnitude - startMagnitude
end
```

## 状态控制

这里就是产品需求恶心的地方了, 需要考虑手势之间的交互冲突. 目前的处理是有一个总体系统设计, 如果相机正在被缩放屏蔽地图元素的交互, 自维护了一个bool 每次update的时候设为false如果输入为两指设置true

## 结语

目前第一部分主要内容是对于照相机代码控制的总结, 没有特别大的革新, 同样就不会有很多的心得与体会, 只是对这部分业务代码做了一些总结和批注. 只能算作是开胃小菜, 下一章将要讨论沙盒必定需要的设计模式 —— 命令模式
