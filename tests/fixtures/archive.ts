// Created by weixi on 2026/10/14.

import type { ArchivePost } from '../../src/utils/archive';

// Hand-written search data keeps expectations independent of the filtering implementation.
export const posts: ArchivePost[] = [
  {
    slug: 'image-compression',
    href: '/posts/image-compression/',
    title: 'WICompress 图片压缩',
    category: 'iOS',
    tags: ['图片', '性能'],
    year: '2026',
    searchText: 'wicompress 图片压缩 ios 图片 性能 内存 2026',
  },
  {
    slug: 'react-archive',
    href: '/posts/react-archive/',
    title: '归档页接入 React',
    category: 'Web',
    tags: ['React'],
    year: '2026',
    searchText: '归档页接入 react web 组件 2026',
  },
  {
    slug: 'image-cache',
    href: '/posts/image-cache/',
    title: '网络图片调研',
    category: 'iOS',
    tags: ['缓存'],
    year: '2025',
    searchText: '网络图片调研 ios 缓存 内存 2025',
  },
  {
    slug: 'why-create',
    href: '/posts/why-create/',
    title: '为什么还在创作',
    category: '随笔',
    tags: ['写作'],
    year: '2024',
    searchText: '为什么还在创作 随笔 写作 2024',
  },
];

export const categories = [
  { name: 'iOS', count: 2 },
  { name: 'Web', count: 1 },
  { name: '随笔', count: 1 },
];
