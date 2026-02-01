import React, { useState, useCallback, useEffect } from 'react';
import { Box, Image, IconButton, Text, Flex } from '@chakra-ui/react';

interface ImageCarouselProps {
  images: Array<{
    url: string;
    thumbnailUrl?: string;
    source?: string;
    sourceUrl?: string;
  }>;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }, [images.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        prevSlide();
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        nextSlide();
        event.preventDefault();
      }
    };

    // Add event listener when component mounts
    document.addEventListener('keydown', handleKeyDown);

    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [nextSlide, prevSlide]);

  if (!images || images.length === 0) {
    return (
      <Flex w="full" h="48" bg="bg.subtle" borderRadius="lg" alignItems="center" justifyContent="center" color="fg.muted" role="img" aria-label="No images available">
        No images available
      </Flex>
    );
  }

return (
    <Box 
      position="relative" 
      role="group" 
      w="full" 
      h="48" 
      mt={4} 
      overflow="hidden" 
      borderRadius="lg" 
      bg="bg.subtle"
      tabIndex={0} // Make focusable for keyboard access
      aria-label={`Image carousel ${currentIndex + 1} of ${images.length}`}
      aria-roledescription="carousel"
    >
      <Image
        src={images[currentIndex].url}
        alt={`Car image ${currentIndex + 1} of ${images.length}`}
        loading="lazy"
        w="full"
        h="full"
        objectFit="cover"
        transition="opacity 0.5s"
      />
      
      {images.length > 1 && (
        <>
<IconButton
            aria-label="Previous image"
            onClick={prevSlide}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                prevSlide();
                e.preventDefault();
              }
            }}
            position="absolute"
            left={2}
            top="50%"
            transform="translateY(-50%)"
            bg="bg.overlay"
            color="fg.contrast"
            size="sm"
            rounded="full"
            opacity={0}
            _hover={{ bg: 'bg.overlay' }}
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.2s"
          >
            <Text fontSize="lg">←</Text>
          </IconButton>
          <IconButton
            aria-label="Next image"
            onClick={nextSlide}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                nextSlide();
                e.preventDefault();
              }
            }}
            position="absolute"
            right={2}
            top="50%"
            transform="translateY(-50%)"
            bg="bg.overlay"
            color="fg.contrast"
            size="sm"
            rounded="full"
            opacity={0}
            _hover={{ bg: 'bg.overlay' }}
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.2s"
          >
            <Text fontSize="lg">→</Text>
          </IconButton>
<Flex 
            position="absolute" 
            bottom={2} 
            left="50%" 
            transform="translateX(-50%)" 
            gap={1}
            role="tablist"
            aria-label="Image navigation dots"
          >
            {images.map((_, idx) => (
              <Box
                key={idx}
                w="1.5"
                h="1.5"
                rounded="full"
                bg={idx === currentIndex ? 'fg.contrast' : 'fg.muted'}
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Go to image ${idx + 1}`}
                cursor="pointer"
                onClick={() => setCurrentIndex(idx)}
                tabIndex={idx === currentIndex ? -1 : 0}
              />
            ))}
          </Flex>
        </>
      )}
    </Box>
  );
};

export default ImageCarousel;
