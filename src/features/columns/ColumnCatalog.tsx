// Created by weixi on 2026/11/18.

import SiteBanner from '../../components/site/SiteBanner';
import type { Column } from './catalog';
import { arrangeColumnRows, DIRECTORY_THRESHOLD } from './catalog-layout';
import './columns.css';

export const COLUMN_BANNER = '/images/columns-cottage.webp';

export default function ColumnCatalog({ columns }: { columns: Column[] }) {
  return (
    <div className="column-catalog">
      <SiteBanner title="专栏" summary={'兜兜转转，\n每一次重逢都给出新的答案。'} image={COLUMN_BANNER} imageLayout="illustration" />
      <div className="column-content">
        {columns.length >= DIRECTORY_THRESHOLD && (
          <div className="column-toolbar">
            <span>{columns.length} 个专栏</span>
            <fieldset>
              <legend>浏览方式</legend>
              <label><input type="radio" name="column-view" value="gallery" defaultChecked /><span>图文</span></label>
              <label><input type="radio" name="column-view" value="directory" /><span>目录</span></label>
            </fieldset>
          </div>
        )}
        {columns.length === 0 ? (
          <p className="column-empty">还没有专栏。<a href="/archive/">浏览文章归档</a></p>
        ) : (
          <div className="column-rows">
            {arrangeColumnRows(columns).map(({ prominence, tracks, columns: row }) => (
              <ul key={row[0].slug} className="column-row" data-tier={prominence} data-tracks={tracks} role="list">
                {row.map(column => (
                  <li key={column.slug}>
                    <a className="column-card" href={`/columns/${column.slug}/`}>
                      {column.cover && <img className="column-card__cover" src={column.cover} alt="" loading="lazy" decoding="async" />}
                      <div className="column-card__copy">
                        <h2>{column.title}</h2>
                        <small className="column-count">{column.articles.length} 篇文章</small>
                        <p>{column.intro}</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
