import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PinSelectorProps {
  remainingPins: number[];
  onPinsKnocked: (knockedPins: number[]) => void;
}

// Touch gesture handling constants
const TOUCH_SLOP_THRESHOLD = 8; // pixels - reduced for more precise detection
const TAP_TIMEOUT = 250; // milliseconds - reduced for faster response

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isActive: boolean;
}

// Bowling Pin Component with precise coordinate-based click detection
const BowlingPin = ({
  isSelected,
  isRemaining,
  pinNumber,
  onClick,
  layoutDimensions,
}: {
  isSelected: boolean;
  isRemaining: boolean;
  pinNumber: number;
  onClick: () => void;
  layoutDimensions: { width: number; height: number };
}) => {
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isActive: false,
  });
  const [isPressed, setIsPressed] = useState(false);
  const pinRef = useRef<HTMLDivElement>(null);

  // Calculate responsive pin dimensions - reduced from doubled size to 1.5x original size
  const pinDimensions = {
    width: Math.max(105, Math.min(210, layoutDimensions.width * 0.18)),
    height: Math.max(158, Math.min(315, layoutDimensions.height * 0.33)),
  };

  // Precise click detection using bounding box with improved accuracy
  const isClickWithinPin = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (!pinRef.current) return false;

      const rect = pinRef.current.getBoundingClientRect();

      // Add small tolerance for edge cases but maintain precision
      const tolerance = 2;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Check if click is within the pin's bounding box with tolerance
      return (
        x >= -tolerance &&
        x <= rect.width + tolerance &&
        y >= -tolerance &&
        y <= rect.height + tolerance
      );
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isRemaining) return;

      // Verify click is within pin bounds
      if (isClickWithinPin(e.clientX, e.clientY)) {
        setIsPressed(true);
      }
    },
    [isRemaining, isClickWithinPin],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isRemaining || !isPressed) {
        setIsPressed(false);
        return;
      }

      // Verify click end is within pin bounds
      if (isClickWithinPin(e.clientX, e.clientY)) {
        onClick();
      }
      setIsPressed(false);
    },
    [isRemaining, isPressed, onClick, isClickWithinPin],
  );

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isRemaining) return;

      const touch = e.touches[0];

      // Verify touch start is within pin bounds
      if (!isClickWithinPin(touch.clientX, touch.clientY)) return;

      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isActive: true,
      };
      setIsPressed(true);
    },
    [isRemaining, isClickWithinPin],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!touchState.current.isActive || !isRemaining) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchState.current.startX);
      const deltaY = Math.abs(touch.clientY - touchState.current.startY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If movement exceeds threshold, cancel the tap
      if (distance > TOUCH_SLOP_THRESHOLD) {
        touchState.current.isActive = false;
        setIsPressed(false);
      }
    },
    [isRemaining],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isRemaining) {
        touchState.current.isActive = false;
        setIsPressed(false);
        return;
      }

      const touchDuration = Date.now() - touchState.current.startTime;

      // Only trigger click if it was a valid tap (within time and distance thresholds)
      if (touchState.current.isActive && touchDuration < TAP_TIMEOUT) {
        // Use the last known touch position for final validation
        const touch = e.changedTouches[0];
        if (isClickWithinPin(touch.clientX, touch.clientY)) {
          onClick();
        }
      }

      touchState.current.isActive = false;
      setIsPressed(false);
    },
    [isRemaining, onClick, isClickWithinPin],
  );

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchState.current.isActive = false;
    setIsPressed(false);
  }, []);

  return (
    <div
      ref={pinRef}
      className={`bowling-pin-clickable-area relative select-none transition-all duration-150 transform ${
        !isRemaining ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
      } ${
        isPressed
          ? "scale-90"
          : isSelected
            ? "scale-95 hover:scale-90"
            : "hover:scale-105"
      }`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        // Ensure the clickable area exactly matches the visual pin dimensions - reduced size
        width: `${pinDimensions.width}px`,
        height: `${pinDimensions.height}px`,
      }}
    >
      {/* Pin image container with exact dimensions */}
      <div className="bowling-pin-container pointer-events-none relative w-full h-full">
        <img
          src="/assets/generated/bowling-pin-transparent.png"
          alt={`Pin ${pinNumber}`}
          className={`bowling-pin-image transition-all duration-150 pointer-events-none w-full h-full ${
            !isRemaining
              ? "grayscale opacity-50"
              : isSelected
                ? "brightness-75 saturate-150"
                : "brightness-100"
          }`}
          style={{
            filter: isSelected
              ? "brightness(0.7) saturate(1.5) hue-rotate(0deg)"
              : isRemaining
                ? "brightness(1.1) saturate(1.2)"
                : "grayscale(1) opacity(0.5)",
          }}
          loading="eager"
          draggable={false}
        />

        {/* Selection indicator - perfectly centered on the pin image with reduced size considerations */}
        <div
          className={`bowling-pin-selection-dot absolute bg-destructive rounded-full border-2 border-white shadow-lg pointer-events-none ${
            isSelected
              ? "bowling-pin-selection-dot-visible"
              : "bowling-pin-selection-dot-hidden"
          }`}
          style={{
            width: `${Math.max(28, pinDimensions.width * 0.16)}px`,
            height: `${Math.max(28, pinDimensions.width * 0.16)}px`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {/* Pin number overlay - positioned relative to the pin container with reduced size considerations */}
      <div
        className={`absolute inset-0 flex items-center justify-center bowling-pin-number pointer-events-none ${
          !isRemaining
            ? "text-muted-foreground"
            : isSelected
              ? "text-white drop-shadow-lg"
              : "text-primary-foreground drop-shadow-md"
        }`}
        style={{
          fontSize: `${Math.max(22, pinDimensions.width * 0.12)}px`,
          fontWeight: "bold",
        }}
      >
        {pinNumber}
      </div>
    </div>
  );
};

export function PinSelector({
  remainingPins,
  onPinsKnocked,
}: PinSelectorProps) {
  const [selectedPins, setSelectedPins] = useState<number[]>([]);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutDimensions, setLayoutDimensions] = useState({
    width: 800,
    height: 600,
  });

  // Track layout dimensions for responsive pin sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (layoutRef.current) {
        const rect = layoutRef.current.getBoundingClientRect();
        setLayoutDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Standard bowling pin arrangement facing the player with increased spacing:
  // Pin 1 at the front (closest to player), pins 7,8,9,10 at the back (furthest from player)
  // Correct bowling formation: 1 / 2-3 / 4-5-6 / 7-8-9-10
  // Increased spacing between pins for better tap accuracy
  const pinPositions = [
    { id: 1, x: 50, y: 82 }, // Pin 1 - Head pin (front/closest to player) - moved down slightly
    { id: 2, x: 38, y: 64 }, // Pin 2 - Second row left - moved further left
    { id: 3, x: 62, y: 64 }, // Pin 3 - Second row right - moved further right
    { id: 4, x: 26, y: 46 }, // Pin 4 - Third row left - moved further left
    { id: 5, x: 50, y: 46 }, // Pin 5 - Third row center - unchanged
    { id: 6, x: 74, y: 46 }, // Pin 6 - Third row right - moved further right
    { id: 7, x: 14, y: 28 }, // Pin 7 - Back row far left - moved much further left
    { id: 8, x: 38, y: 28 }, // Pin 8 - Back row left center - moved further left
    { id: 9, x: 62, y: 28 }, // Pin 9 - Back row right center - moved further right
    { id: 10, x: 86, y: 28 }, // Pin 10 - Back row far right - moved much further right
  ];

  const togglePin = useCallback((pinId: number) => {
    setSelectedPins((prev) => {
      if (prev.includes(pinId)) {
        return prev.filter((id) => id !== pinId);
      }
      return [...prev, pinId];
    });
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedPins([]);
  }, []);

  const confirmRoll = useCallback(() => {
    onPinsKnocked(selectedPins);
    setSelectedPins([]);
  }, [selectedPins, onPinsKnocked]);

  const knockedCount = selectedPins.length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Select pins knocked down</h3>
        <div className="flex items-center justify-center space-x-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {remainingPins.length} pins standing
          </Badge>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {knockedCount} selected
          </Badge>
        </div>
        {remainingPins.length < 10 && (
          <div className="mt-2 text-sm text-muted-foreground">
            Remaining pins: {remainingPins.sort((a, b) => a - b).join(", ")}
          </div>
        )}
      </div>

      {/* Pin Layout with precise coordinate mapping - adjusted for smaller pins with increased spacing */}
      <div className="flex justify-center">
        <div ref={layoutRef} className="bowling-pin-layout-spaced relative">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-accent/10 rounded-lg border-2 border-dashed border-accent/30 flex flex-col justify-between p-6">
            {/* Lane direction indicator */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground">← Lane →</div>
            </div>

            {/* Pin area - centered container with precise positioning for spaced pins */}
            <div className="flex-1 relative flex items-center justify-center">
              {/* Render all pin positions with precise coordinate mapping */}
              {pinPositions.map((pin) => {
                const isRemaining = remainingPins.includes(pin.id);
                const isSelected = selectedPins.includes(pin.id);

                // Calculate responsive pin dimensions - reduced from doubled size
                const pinDimensions = {
                  width: Math.max(
                    105,
                    Math.min(210, layoutDimensions.width * 0.18),
                  ),
                  height: Math.max(
                    158,
                    Math.min(315, layoutDimensions.height * 0.33),
                  ),
                };

                return (
                  <div
                    key={pin.id}
                    className="absolute bowling-pin-position"
                    style={{
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: isSelected ? 10 : 1,
                      // Ensure consistent dimensions for precise click detection - reduced size
                      width: `${pinDimensions.width}px`,
                      height: `${pinDimensions.height}px`,
                    }}
                  >
                    <BowlingPin
                      isSelected={isSelected}
                      isRemaining={isRemaining}
                      pinNumber={pin.id}
                      onClick={() => togglePin(pin.id)}
                      layoutDimensions={layoutDimensions}
                    />
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <div className="text-xs text-muted-foreground">You</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: remainingPins.length + 1 }, (_, i) => (
          <Button
            key={`knock-${i}-of-${remainingPins.length}`}
            variant={knockedCount === i ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (i === 0) {
                setSelectedPins([]);
              } else {
                // Select the first i remaining pins
                setSelectedPins(remainingPins.slice(0, i));
              }
            }}
          >
            {i}
          </Button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          onClick={resetSelection}
          disabled={knockedCount === 0}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button onClick={confirmRoll} size="lg" className="px-8">
          Roll ({knockedCount} pins)
        </Button>
      </div>

      {/* Special Badges */}
      <div className="flex justify-center space-x-2">
        {knockedCount === 10 && (
          <Badge className="flex items-center space-x-1">
            <img
              src="/assets/generated/bowling-ball-icon.png"
              alt="Strike"
              className="w-4 h-4 object-contain"
            />
            <span>STRIKE!</span>
          </Badge>
        )}
        {knockedCount === remainingPins.length && remainingPins.length < 10 && (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <div className="bowling-pin-badge-container">
              <img
                src="/assets/generated/bowling-pin-transparent.png"
                alt="Spare"
                className="bowling-pin-badge"
              />
            </div>
            <span>SPARE!</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
