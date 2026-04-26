import { useState } from "react";
import { Rnd } from "react-rnd";
import { RotateCw, RotateCcw, Trash2, Crop, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { ImageBlock } from "@/lib/notes-store";

interface Props {
  block: ImageBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (b: ImageBlock) => void;
  onDelete: () => void;
}

export function ImageBlockView({ block, isSelected, onSelect, onChange, onDelete }: Props) {
  const [cropping, setCropping] = useState(false);
  // crop overlay (in px relative to current rendered image rect)
  const [cropRect, setCropRect] = useState({ x: 20, y: 20, w: 200, h: 150 });

  const applyCrop = async () => {
    // load image then draw crop region into canvas at natural-resolution
    const img = new Image();
    img.src = block.dataUrl;
    await new Promise((r) => (img.onload = r));
    const scaleX = img.naturalWidth / block.width;
    const scaleY = img.naturalHeight / block.height;
    const sx = cropRect.x * scaleX;
    const sy = cropRect.y * scaleY;
    const sw = cropRect.w * scaleX;
    const sh = cropRect.h * scaleY;
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const newUrl = canvas.toDataURL("image/png");
    onChange({ ...block, dataUrl: newUrl, width: cropRect.w, height: cropRect.h });
    setCropping(false);
  };

  return (
    <div className="image-canvas" onMouseDown={onSelect}>
      <Rnd
        size={{ width: block.width, height: block.height }}
        position={{ x: block.x, y: 20 }}
        onDragStop={(_, d) => onChange({ ...block, x: d.x })}
        onResizeStop={(_, __, ref) =>
          onChange({
            ...block,
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          })
        }
        bounds="parent"
        lockAspectRatio={false}
        style={{
          transform: `rotate(${block.rotation}deg)`,
          transformOrigin: "center",
        }}
      >
        <div className="relative h-full w-full">
          <img
            src={block.dataUrl}
            alt={block.name}
            draggable={false}
            className="h-full w-full select-none rounded-md object-cover shadow-lg"
          />
          {cropping && (
            <Rnd
              size={{ width: cropRect.w, height: cropRect.h }}
              position={{ x: cropRect.x, y: cropRect.y }}
              onDragStop={(_, d) => setCropRect((p) => ({ ...p, x: d.x, y: d.y }))}
              onResizeStop={(_, __, ref, ___, pos) =>
                setCropRect({
                  x: pos.x,
                  y: pos.y,
                  w: parseInt(ref.style.width),
                  h: parseInt(ref.style.height),
                })
              }
              bounds="parent"
              className="border-2 border-primary bg-primary/10"
            />
          )}
        </div>
      </Rnd>

      {isSelected && (
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-2 rounded-lg border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => onChange({ ...block, rotation: block.rotation - 15 })}
              title="Rotate left">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => onChange({ ...block, rotation: block.rotation + 15 })}
              title="Rotate right">
              <RotateCw className="h-4 w-4" />
            </Button>
            {!cropping ? (
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setCropping(true)} title="Crop">
                <Crop className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={applyCrop} title="Apply crop">
                  <Check className="h-4 w-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setCropping(false)} title="Cancel crop">
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} title="Delete">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="flex items-center gap-2 px-1">
            <span className="w-12 text-xs text-muted-foreground">Rotate</span>
            <Slider
              value={[block.rotation]}
              min={-180} max={180} step={1}
              onValueChange={(v) => onChange({ ...block, rotation: v[0] })}
              className="w-32"
            />
            <span className="w-10 text-right text-xs tabular-nums">{block.rotation}°</span>
          </div>
        </div>
      )}
    </div>
  );
}
