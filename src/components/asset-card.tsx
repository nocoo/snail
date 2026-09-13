import { Badge, Button, Checkbox, LayerCard } from "@nocoo/basalt";
import { TagBadge } from "@nocoo/basalt/components/tag-badge";
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
    <LayerCard
      role="article"
      data-asset-card
      data-selected={selected}
      outlined={selected}
      className="asset-card min-w-0"
    >
      <LayerCard.Well className="asset-visual relative p-0">
        <Button
          variant="ghost"
          className="asset-play rounded-none p-0"
          aria-label="播放视频"
          onClick={onPlay}
        >
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
            <span className="poster-placeholder text-basalt-muted-foreground">
              <Video className="size-8" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-xs">Snail</span>
            </span>
          )}
          <span className="play-overlay">
            <Play className="size-6" fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
          </span>
        </Button>
        <Checkbox
          className="absolute left-2 top-2"
          aria-label={`选择 ${asset.title}`}
          checked={selected}
          onCheckedChange={onSelect}
        />
        <Badge
          variant="secondary"
          className="pointer-events-none absolute bottom-2 right-2 tabular-nums"
        >
          {formatDuration(asset.duration)}
        </Badge>
        <Button
          variant={asset.favorite ? "secondary" : "outline"}
          size="icon"
          className="absolute right-2 top-2 size-8"
          aria-label={asset.favorite ? "取消收藏" : "加入收藏"}
          aria-pressed={asset.favorite}
          onClick={onFavorite}
        >
          <Heart
            className="size-4"
            fill={asset.favorite ? "currentColor" : "none"}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Button>
      </LayerCard.Well>
      <LayerCard.Body className="asset-info min-w-0 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlay}
          className="w-full min-w-0 justify-start px-0 text-left"
        >
          <span className="truncate">{asset.title}</span>
        </Button>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-basalt-muted-foreground">
          <span>{asset.sourceId ? "X 收藏" : "本机上传"}</span>
          <span>{formatBytes(asset.size)}</span>
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} name={tag.name} colorKey={tag.id} size="sm" />
            ))}
          </div>
        )}
      </LayerCard.Body>
    </LayerCard>
  );
}
