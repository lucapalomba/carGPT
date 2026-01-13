import React, { useState } from 'react';
import { Box, Image, IconButton, Text, Flex } from '@chakra-ui/react';

interface ImageCarouselProps {
  images: Array<{
    url: string;
    title: string;
  }>;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <Flex w="full" h="48" bg="gray.100" borderRadius="lg" alignItems="center" justifyContent="center" color="gray.400">
        No images available
      </Flex>
    );
  }

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  return (
    <Box position="relative" role="group" w="full" h="48" mt={4} overflow="hidden" borderRadius="lg" bg="gray.100">
      <Image
        src={images[currentIndex].url}
        alt={images[currentIndex].title}
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
            icon={<Text fontSize="lg">←</Text>}
            onClick={prevSlide}
            position="absolute"
            left={2}
            top="50%"
            transform="translateY(-50%)"
            bg="blackAlpha.300"
            color="white"
            size="sm"
            rounded="full"
            opacity={0}
            _hover={{ bg: 'blackAlpha.500' }}
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.2s"
          />
          <IconButton
            aria-label="Next image"
            icon={<Text fontSize="lg">→</Text>}
            onClick={nextSlide}
            position="absolute"
            right={2}
            top="50%"
            transform="translateY(-50%)"
            bg="blackAlpha.300"
            color="white"
            size="sm"
            rounded="full"
            opacity={0}
            _hover={{ bg: 'blackAlpha.500' }}
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.2s"
          />
          <Flex position="absolute" bottom={2} left="50%" transform="translateX(-50%)" gap={1}>
            {images.map((_, idx) => (
              <Box
                key={idx}
                w="1.5"
                h="1.5"
                rounded="full"
                bg={idx === currentIndex ? 'white' : 'whiteAlpha.500'}
              />
            ))}
          </Flex>
        </>
      )}
    </Box>
  );
};

export default ImageCarousel;
