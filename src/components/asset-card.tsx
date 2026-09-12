import { Heart, Play, Video } from "lucide-react";
import type { Asset } from "../../shared/types";
import { formatBytes, formatDuration } from "../lib/format";

export function AssetCard({
  asset,
  selected,
  onSelect,
  onPlay,
  onFavorite,
}: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onFavorite: () => void;
}) {
  return (
    <article data-asset-card data-selected={selected} className="asset-card">
      <div className="asset-visual">
        <button type="button" className="asset-play" aria-label="播放视频" onClick={onPlay}>
          {asset.hasPoster ? (
            <img
              src={`/api/assets/${asset.id}/poster`}
              alt=""
              loading="lazy"
              style={{
                aspectRatio:
                  asset.width && asset.height ? `${asset.width}/${asset.height}` : undefined,
              }}
            />
          ) : (
            <span className="poster-placeholder">
              <Video size={34} strokeWidth={1} />
              <span>Snail</span>
            </span>
          )}
          <span className="play-overlay">
            <Play size={22} fill="currentColor" />
          </span>
        </button>
        <label className="asset-select">
          <input
            type="checkbox"
            aria-label={`选择 ${asset.title}`}
            checked={selected}
            onChange={onSelect}
          />
        </label>
        <span className="duration-label">{formatDuration(asset.duration)}</span>
        <button
          type="button"
          className={`favorite-button ${asset.favorite ? "is-favorite" : ""}`}
          aria-label={asset.favorite ? "取消收藏" : "加入收藏"}
          onClick={onFavorite}
        >
          <Heart size={17} fill={asset.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="asset-info">
        <button type="button" onClick={onPlay} className="asset-title">
          {asset.title}
        </button>
        <div className="asset-subline">
          <span>{asset.sourceId ? "X 收藏" : "本机上传"}</span>
          <span>{formatBytes(asset.size)}</span>
        </div>
        {asset.tags.length > 0 && (
          <div className="asset-tags">
            {asset.tags.slice(0, 3).map((tag) => (
              <span key={tag.id}>{tag.name}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
