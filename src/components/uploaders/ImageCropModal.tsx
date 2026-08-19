import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Slider } from "antd";
import { ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export interface ImageCropModalProps {
    /** Controls modal visibility. */
    open: boolean;
    /** Object URL (or data URL) of the source image to crop — must be same-origin/blob so the
     *  canvas export below isn't tainted by cross-origin restrictions. */
    imageUrl: string | null;
    /** width / height of the crop frame, e.g. 4/3 for advert photos, 1 for square/circular
     *  thumbnails (category icons, avatars). */
    aspect: number;
    /** 'round' draws a circular mask over the crop frame (category/avatar icons) — the
     *  exported raster itself is still a plain rectangular image; the circular clip is applied
     *  by the existing `rounded-full overflow-hidden` wrappers at display time, same as every
     *  other image in the app. */
    shape?: "rect" | "round";
    title?: string;
    /** Overrides the default "Застосувати"/"Apply" confirm button text — e.g. the avatar
     *  cropper uses "Зберегти" ("Save") instead, since confirming there also implies the photo
     *  is now staged for the profile save, not just applied to the crop preview. */
    okText?: string;
    cancelText?: string;
    onCancel: () => void;
    onConfirm: (blob: Blob) => void;
}

// Crop frame is sized in CSS px — large enough to comfortably drag/pinch on both desktop and
// mobile, small enough to fit inside antd's default Modal width (520px) with padding.
const FRAME_MAX_WIDTH = 420;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
// Raster resolution the cropped Blob is exported at (independent of the on-screen frame size),
// scaled to the modal's aspect ratio — matches AdvertCard/CategoryAvatar's own 4:3 / 1:1 display
// ratios so nothing gets re-letterboxed downstream.
const EXPORT_LONG_EDGE = 1200;

interface NaturalSize {
    width: number;
    height: number;
}

// Lightweight canvas-based center/zoom/pan cropper — no extra dependency (react-easy-crop,
// cropperjs, ...) beyond what's already in the bundle. Mouse drag, wheel-to-zoom, the zoom
// slider, and single/two-finger touch (pan / pinch-zoom) all funnel into the same `offset` +
// `zoom` state, then `exportCrop` reads that state back into canvas source-rect math once.
const ImageCropModal: React.FC<ImageCropModalProps> = ({ open, imageUrl, aspect, shape = "rect", title, okText, cancelText, onCancel, onConfirm }) => {
    const { t } = useTranslation();
    const imgRef = useRef<HTMLImageElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);

    const frameWidth = FRAME_MAX_WIDTH;
    const frameHeight = frameWidth / aspect;

    const [natural, setNatural] = useState<NaturalSize | null>(null);
    const [zoom, setZoom] = useState(1);
    // Top-left corner of the displayed (scaled) image, in frame-relative CSS px.
    const [offset, setOffset] = useState({ left: 0, top: 0 });
    const dragState = useRef<{ pointerId: number; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
    const pinchState = useRef<{ startDist: number; startZoom: number } | null>(null);

    // baseScale: the zoom=1 scale that makes the image just cover the frame (shorter axis
    // matches exactly, longer axis overflows) — the classic "cover" fit, same behavior as the
    // `object-cover` the rest of the app already uses for these images.
    const baseScale = useMemo(() => {
        if (!natural) return 1;
        return Math.max(frameWidth / natural.width, frameHeight / natural.height);
    }, [natural, frameWidth, frameHeight]);

    const effectiveScale = baseScale * zoom;
    const displayWidth = natural ? natural.width * effectiveScale : 0;
    const displayHeight = natural ? natural.height * effectiveScale : 0;

    // Clamps a candidate image position so it always fully covers the frame (no empty gaps) —
    // takes `scale` explicitly rather than closing over `effectiveScale` because applyZoom needs
    // to clamp against the *next* zoom level's scale, before that zoom is committed to state.
    const clampFor = (left: number, top: number, scale: number): { left: number; top: number } => {
        if (!natural) return { left, top };
        const w = natural.width * scale;
        const h = natural.height * scale;
        const minLeft = Math.min(0, frameWidth - w);
        const minTop = Math.min(0, frameHeight - h);
        return { left: Math.min(0, Math.max(minLeft, left)), top: Math.min(0, Math.max(minTop, top)) };
    };

    // Reset to a centered, fully-zoomed-out crop every time a new image is loaded into the modal.
    useEffect(() => {
        if (!open) return;
        setZoom(1);
        setNatural(null);
        setOffset({ left: 0, top: 0 });
    }, [open, imageUrl]);

    const handleImgLoad = () => {
        const el = imgRef.current;
        if (!el) return;
        const size = { width: el.naturalWidth, height: el.naturalHeight };
        setNatural(size);
        const scale = Math.max(frameWidth / size.width, frameHeight / size.height);
        setOffset({ left: (frameWidth - size.width * scale) / 2, top: (frameHeight - size.height * scale) / 2 });
    };

    // Keep the same image point under the frame's center when the zoom level changes (slider,
    // wheel, or pinch) instead of re-centering on the image's own center every time.
    const applyZoom = (nextZoomRaw: number) => {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoomRaw));
        if (!natural) {
            setZoom(nextZoom);
            return;
        }
        const prevScale = baseScale * zoom;
        const nextScale = baseScale * nextZoom;
        const centerX = frameWidth / 2;
        const centerY = frameHeight / 2;
        const fracX = (centerX - offset.left) / (natural.width * prevScale);
        const fracY = (centerY - offset.top) / (natural.height * prevScale);
        const nextLeft = centerX - fracX * natural.width * nextScale;
        const nextTop = centerY - fracY * natural.height * nextScale;
        setZoom(nextZoom);
        setOffset(clampFor(nextLeft, nextTop, nextScale));
    };

    const onPointerDown = (e: React.PointerEvent) => {
        // Ignores secondary touch pointers (the 2nd finger of a pinch) — pinch-zoom is handled
        // separately below via the native TouchEvent handlers, so letting it also drive drag here
        // would fight the pinch math.
        if (e.pointerType === "touch" && !e.isPrimary) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragState.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startLeft: offset.left, startTop: offset.top };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        setOffset(clampFor(dragState.current.startLeft + dx, dragState.current.startTop + dy, effectiveScale));
    };
    const endDrag = (e: React.PointerEvent) => {
        if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
    };

    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        applyZoom(zoom + (e.deltaY < 0 ? 0.15 : -0.15));
    };

    // Two-finger pinch — react's synthetic touch events (not pointer events) so it works
    // alongside the pointer-based single-finger pan above without the two handlers fighting
    // over the same gesture.
    const touchDistance = (touches: React.TouchList) => {
        const [a, b] = [touches[0], touches[1]];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            pinchState.current = { startDist: touchDistance(e.touches), startZoom: zoom };
        }
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchState.current) {
            e.preventDefault();
            const dist = touchDistance(e.touches);
            const ratio = dist / pinchState.current.startDist;
            applyZoom(pinchState.current.startZoom * ratio);
        }
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) pinchState.current = null;
    };

    const handleConfirm = () => {
        const el = imgRef.current;
        if (!el || !natural) return;

        const exportWidth = aspect >= 1 ? EXPORT_LONG_EDGE : Math.round(EXPORT_LONG_EDGE * aspect);
        const exportHeight = aspect >= 1 ? Math.round(EXPORT_LONG_EDGE / aspect) : EXPORT_LONG_EDGE;

        // Map the on-screen frame-relative offset/scale back into natural-image pixel space:
        // sourceX/Y is how far into the original photo the frame's top-left corner sits.
        const sourceX = -offset.left / effectiveScale;
        const sourceY = -offset.top / effectiveScale;
        const sourceW = frameWidth / effectiveScale;
        const sourceH = frameHeight / effectiveScale;

        const canvas = document.createElement("canvas");
        canvas.width = exportWidth;
        canvas.height = exportHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(el, sourceX, sourceY, sourceW, sourceH, 0, 0, exportWidth, exportHeight);

        canvas.toBlob(
            (blob) => {
                if (blob) onConfirm(blob);
            },
            "image/jpeg",
            0.92
        );
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            title={title ?? t("imageCropModal.title")}
            width={frameWidth + 80}
            onOk={handleConfirm}
            okText={okText ?? t("imageCropModal.apply")}
            cancelText={cancelText ?? t("common.cancel")}
            destroyOnHidden
        >
            <div className="flex flex-col items-center gap-4">
                <div
                    ref={frameRef}
                    style={{ width: frameWidth, height: frameHeight, touchAction: "none" }}
                    className={`relative overflow-hidden bg-neutral-900 select-none cursor-grab active:cursor-grabbing ${
                        shape === "round" ? "rounded-full" : "rounded-lg"
                    }`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onWheel={onWheel}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {imageUrl && (
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt=""
                            onLoad={handleImgLoad}
                            draggable={false}
                            style={{
                                position: "absolute",
                                left: offset.left,
                                top: offset.top,
                                width: displayWidth || undefined,
                                height: displayHeight || undefined,
                                maxWidth: "none",
                            }}
                        />
                    )}
                    {/* Rule-of-thirds guide grid — purely visual, ignored by the export canvas. */}
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="border border-white/20" />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full max-w-xs">
                    <ZoomOutOutlined className="text-gray-400" />
                    <Slider
                        className="flex-1"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={zoom}
                        onChange={(v) => applyZoom(v as number)}
                        tooltip={{ open: false }}
                    />
                    <ZoomInOutlined className="text-gray-400" />
                </div>
                <p className="text-xs text-gray-400 text-center">{t("imageCropModal.hint")}</p>
            </div>
        </Modal>
    );
};

export default ImageCropModal;
