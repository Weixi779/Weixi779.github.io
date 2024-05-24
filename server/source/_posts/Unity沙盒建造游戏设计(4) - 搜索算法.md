---
title: Unity沙盒建造游戏设计(4) - 搜索算法
catalog: true
top: false
mathjax: true
date: 2024-05-04 13:50:47
summary:
tags: [Unity, 沙盒, 算法]
categories: [Unity, 技术分享]
---

# 前言

在近期的公司项目中，需求项目开发一个类沙盒建造功能。我有幸负责项目中的关键部分，这一经历充满了挑战与收获。鉴于这个部分内容的丰富性和技术性，我决定将涉及相关设计以及本人的一部分思绪分成四期内容。本文是系列文章的最后一期，将聊一聊沙盒模式中的搜索算法。

在沙盒游戏中二维数组甚至三位数组的管理中基本上来说搜索算法是避免不了了, 用以上算法可以实现: 生成物品、寻路、AI行为, 属于是比较特化的内容. 本期的核心内容会主要围绕着笔者开发的复制内容深入浅出的聊聊搜索算法这部分, 从算法选取的考量, 跟后面算法优化的处理.

# 分类

DFS(Depth-First-Search): 深度优先搜索最常见的搜索算法之一, 中等难度面试题常客, 在解决树、矩阵、八皇后、数独等定制问题的好手, 做简要提及, 在沙盒游戏中并不能作为主角

BFS(Breadth-first search): 广度优先搜索也是常见算法, DFS的好基友, 与上者不同的是基本BFS是纯暴力算法, 会将所有内容遍历一遍,  在面试题中出场概率相比DFS较少, 主要是处理图的内容. 但他是本篇主角.

迪杰斯特拉算法(Dijkstra's Algorithm): 权重+BFS的贪心算法, 大体是BFS的思路, 与基本BFS不同的是该算法主要处理最短路径问题, 并且可以记录权重, 是图论中被广泛使用的算法.

A*搜索算法(A star search algorithm): 启发式迪杰斯特拉算法, 故有基本迪杰斯特拉的特性, 需要额外编写节点的评估算法, 在现代游戏中寻路最常用的算法之一.

这里也能简单的看出算法的发展历程 BFS -> BFS+权重+贪心 = 迪杰斯特拉 -> 迪杰斯特拉+启发式 = A*.

其实同理还有很多的内容没有提及均匀成本、双向、深度限制、迭代加深...

其实也是在某个算法的基础上添加模块出来的内容, 由于本篇没有涉及就不介绍了.

# 历程

需求: 在27x27的方格中, 选择一个物体后, 能够提供复制功能, 在被选中的物体的周围以右下左上的顺序生成一个离原元素最近的新元素.

笔者在接手的时候, 无脑想用AStar算法, 又是网格又是最短路径的, 但写着写发现不对劲, 因为AStar需要设置目的地, 迪杰斯特拉也是同理, 所以最后还是用最基本的BFS写了最初版.

## 占地面积

选中的物体是一个占地2x2的东西如何确认是否能够放置?

其实比较傻, 就是古法遍历, 详细实现内容在`isValidArea`有声明(前俩个函数由于第一问题而编写的, 看不懂也正常)

```lua
--- 获取不同象限的X循环范围
local function CalculateXRange(directions, x, width)
    local rightFactor = directions[1][1]
    return x, x + width * rightFactor - 1, rightFactor
end

--- 获取不同象限的Y循环范围
local function CalculateYRange(directions, y, height)
    local upFactor = directions[4][2]
    return y, y + height * upFactor - 1, upFactor
end

--- 根据方向、起始位置、占地面积循环遍历
--- @param action fun(i: number, j: number)
local function ForEachRange(directions, x, y, width, height, action)
    local startX, targetX, widthFactor = CalculateXRange(directions, x, width)
    local startY, targetY, heightFactor = CalculateYRange(directions, y, height)
    for i = startX, targetX, widthFactor do
        for j = startY, targetY, heightFactor do
            action(i, j)
        end
    end
end

--- 当前索引是否有效
local function isValidIndex(grid, x, y)
    return x >= 1 and x <= #grid and y >= 1 and y <= #grid[x]
end

--- 当前位置是否有效
local function isValidArea(grid, directions, x, y, width, height)
    if not isValidIndex(grid, x, y) or not isValidIndex(grid, x + width - 1, y + height - 1) then
        return false
    end
    local result = true
    ForEachRange(directions, x, y, width, height, function(i, j)
        if not grid[i][j] then
            result = false
        end
    end)
    return result
end
```

这里额外说一句, `visited` 或者叫 `closed` 在实现的时候就做了缓存的规划, 实际上用起来这个方法没有想象中那么浪费性能.

## 启发式

在初版写完之后, 发现是满足不了右下左上的需求, 所以需要在基础BFS的基础上添加评估算法, 在A*常用的评估函数有欧几里得距离、曼哈顿距离、切比雪夫距离, 项目中选择的正方形矩阵所以选的距离为欧几里得 在这里还需要添加上距离的索引值

```lua
local directionOrder = { { 1, 0 }, { 0, -1 }, { -1, 0 }, { 0, 1 } } -- Right, Down, Left, Up

--- 计算启发式分数
local function EvaluateScore(index, startX, startY, x, y, width, height)
    local factorScore = index * 0.2
    local distance1 = (startX - width - x) ^ 2 + (startY - y) ^ 2
    local distance2 = (startX + width - x) ^ 2 + (startY - y) ^ 2
    local distance3 = (startX - x) ^ 2 + (startY - height - y) ^ 2
    local distance4 = (startX - x) ^ 2 + (startY + height - y) ^ 2
    return math.min(distance1, distance2, distance3, distance4) + factorScore
end

local function Search(grid, directions, queue, visited, width, height, startX, startY)
    local result = nil
    local baseScore = math.huge
    while #queue > 0 do
        count = count + 1
        local current = table.remove(queue, 1)
        local x, y, distance = current[1], current[2], current[3]

        for index, direction in ipairs(directions) do
            local newX = x + direction[1]
            local newY = y + direction[2]
            if isValidIndex(grid, newX, newY) and not visited[newX][newY] then
                visited[newX][newY] = true
                table.insert(queue, { newX, newY, distance + 1 })

                if isValidArea(grid, directions, newX, newY, width, height) then
                    local score = EvaluateScore(index, startX, startY, newX, newY, width, height)
                    if score < baseScore then
                        baseScore = score
                        result = { newX, newY }
                    end
                end
            end
        end
    end
    return result
end
```

这个地方是写明了欧几里得距离, 但实际上方便比较其实可以完全不再sqrt也能比出最终的结果.

## 贪心

最后由于起始位置基本都是从元素起始位置开始的, 累加一个答案数量, 然后就可以每次while循环的时候进行比较, 大于贪心数量直接退出循环即可, 每次就不用都跑完27x27的矩阵了, 但实际27x27的矩阵数量到没有那么夸张, 跑完也只是毫秒级的时间差. 这里笔者保险起见规定的贪心数量是25, 感觉这个数字还是可以优化一下的.

# 结语

前阵子笔者日常写算法刷到了腐烂的橘子, 用了一下swift写BFS, 让人感觉差距太大了...., 但很可惜几经周折作者还是离它很远.

其实这个是此系列的最后一篇, 本来作者其实是不考虑写逻辑的, 只想单纯吐槽一下研发现状, 但是写到一半发现太负能量了, 内容厚度也撑不起来一片内容, 最后也是将这些话又咽回到了肚子里.

如果对实时小地图感兴趣的话, 可以再添加一个番外篇, 聊聊Unity相机所踩的部分坑.

最后很荣幸读者能够看到这里, 基本是对进一个月开发的功能简单设计跟回忆, 希望无论是什么开发岗位, 什么开发语言都能从中受益, 再次感谢, 欢迎在任何一篇中留言讨论.

以上, 这里是伟兮, 一个有追求的程序员.
