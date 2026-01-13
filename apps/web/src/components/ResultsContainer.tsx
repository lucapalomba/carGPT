import { useState, useRef, useEffect } from 'react';
import { Box, VStack, Flex, Heading, Text, Button, FormLabel, Input, SimpleGrid } from '@chakra-ui/react';
import type { Car } from '../App';
import ComparisonTable from './ComparisonTable';
import QASection from './QASection';
import DetailedComparison from './DetailedComparison';
import Alternatives from './Alternatives';

interface ResultsContainerProps {
  cars: Car[];
  analysisHistory: string[];
  pinnedIndices: Set<number>;
  onTogglePin: (index: number) => void;
  onRefine: (feedback: string) => void;
  onNewSearch: () => void;
  isSearching: boolean;
}

function ResultsContainer({
  cars,
  analysisHistory,
  pinnedIndices,
  onTogglePin,
  onRefine,
  onNewSearch,
  isSearching
}: ResultsContainerProps) {
  const [refineInput, setRefineInput] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleRefine = () => {
    if (!refineInput.trim()) {
      alert('Please enter some feedback to refine the search.');
      return;
    }
    onRefine(refineInput.trim());
    setRefineInput('');
  };

  return (
    <VStack ref={resultsRef} spacing={12} align="stretch">
      <Flex justify="space-between" align="center" bg="white" p={6} borderRadius="xl" shadow="sm">
        <Heading size="lg" color="gray.900">🎯 Your ideal cars</Heading>
        <Button
          onClick={onNewSearch}
          bg="gray.200"
          _hover={{ bg: 'gray.300' }}
          fontWeight="semibold"
          rounded="lg"
        >
          New Search
        </Button>
      </Flex>

      <Box bg="white" p={8} borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="indigo.100">
        <VStack spacing={6} align="stretch">
          {analysisHistory.map((text, index) => (
            <Box key={index} pb={6} borderBottomWidth="1px" borderBottomColor="gray.100" _last={{ borderBottomWidth: 0, pb: 0 }}>
              <Heading as="h4" size="sm" color="indigo.600" mb={2}>
                {index === 0 ? '📋 Initial Analysis' : `🔄 Refinement #${index}`}
              </Heading>
              <Text color="gray.700" lineHeight="relaxed">{text}</Text>
            </Box>
          ))}
        </VStack>

        <Box mt={8} pt={8} borderTopWidth="1px" borderTopColor="gray.100">
          <FormLabel fontSize="sm" fontWeight="bold" color="gray.700" mb={2}>💬 Refine these results:</FormLabel>
          <Flex gap={4}>
            <Input
              flex={1}
              p={4} // p={3} in tailwind is 0.75rem, Chakra p={4} is 1rem, usually inputs need height or p adjustment. Default Input size="md" is good.
              variant="outline"
              borderColor="gray.300"
              focusBorderColor="indigo.500"
              placeholder="e.g. 'Too expensive', 'I prefer German cars'..."
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRefine()}
            />
            <Button
              onClick={handleRefine}
              isDisabled={isSearching}
              px={8}
              py={4} // Match input height roughly
              bg="indigo.600"
              color="white"
              fontWeight="bold"
              _hover={{ bg: 'indigo.700' }}
              _disabled={{ bg: 'indigo.400', cursor: 'not-allowed' }}
              rounded="lg"
            >
              Update
            </Button>
          </Flex>
          <Text mt={2} fontSize="xs" color="gray.500">💡 Tip: Pin cars you like (📌) to keep them during updates.</Text>
        </Box>
      </Box>

      <ComparisonTable 
        cars={cars} 
        pinnedIndices={pinnedIndices} 
        onTogglePin={onTogglePin} 
      />

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
        <Box gridColumn={{ lg: "span 1" }} bg="white" p={8} borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="indigo.50" display="flex" flexDirection="column" justifyContent="space-between">
           <Box>
             <Heading as="h3" size="md" color="gray.900" mb={6} display="flex" alignItems="center" gap={2}>
               <span>🔍</span> Actions
             </Heading>
             <Text color="gray.600" fontSize="sm" mb={8}>What would you like to do now?</Text>
           </Box>
           
           <VStack spacing={4}>
             <Box 
                as="button"
                onClick={() => setShowCompare(true)}
                w="full"
                p={4}
                bg="gray.50"
                _hover={{ bg: 'gray.100', transform: 'translateX(2px)' }}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                textAlign="left"
                transition="all 0.2s"
             >
                <Text fontWeight="bold" color="indigo.600" mb={1}>📊 Detailed comparison</Text>
                <Text fontSize="xs" color="gray.500">Compare two cars side-by-side in depth</Text>
             </Box>
             <Box 
                as="button"
                onClick={() => setShowAlternatives(true)}
                w="full"
                p={4}
                bg="gray.50"
                _hover={{ bg: 'gray.100', transform: 'translateX(2px)' }}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                textAlign="left"
                transition="all 0.2s"
             >
                <Text fontWeight="bold" color="indigo.600" mb={1}>🔄 Show alternatives</Text>
                <Text fontSize="xs" color="gray.500">Find similar models based on your favorite</Text>
             </Box>
           </VStack>
        </Box>

        <Box gridColumn={{ lg: "span 2" }}>
           <QASection cars={cars} />
        </Box>
      </SimpleGrid>

      {showCompare && (
        <DetailedComparison 
          cars={cars} 
          onClose={() => setShowCompare(false)} 
        />
      )}

      {showAlternatives && (
        <Alternatives 
          cars={cars} 
          onClose={() => setShowAlternatives(false)} 
        />
      )}
    </VStack>
  );
}

export default ResultsContainer;
