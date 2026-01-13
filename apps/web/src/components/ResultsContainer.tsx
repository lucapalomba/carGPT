import { useState, useRef, useEffect } from 'react';
import { Box, Stack, Flex, Heading, Text, Button, Field, Input, SimpleGrid } from '@chakra-ui/react';
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
    <Stack ref={resultsRef} gap={12} align="stretch">
      <Flex justify="space-between" align="center" bg="bg.panel" p={6} borderRadius="xl" shadow="sm">
        <Heading size="lg" color="fg">🎯 Your ideal cars</Heading>
        <Button
          onClick={onNewSearch}
          bg="bg.muted"
          _hover={{ bg: 'border.emphasized' }}
          fontWeight="semibold"
          rounded="lg"
          color="fg"
        >
          New Search
        </Button>
      </Flex>

      <Box bg="bg.panel" p={8} borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="brand.muted">
        <Stack gap={6} align="stretch">
          {analysisHistory.map((text, index) => (
            <Box key={index} pb={6} borderBottomWidth="1px" borderBottomColor="border.subtle" _last={{ borderBottomWidth: 0, pb: 0 }}>
              <Heading as="h4" size="sm" color="brand.emphasized" mb={2}>
                {index === 0 ? '📋 Initial Analysis' : `🔄 Refinement #${index}`}
              </Heading>
              <Text color="fg" lineHeight="relaxed">{text}</Text>
            </Box>
          ))}
        </Stack>

        <Box mt={8} pt={8} borderTopWidth="1px" borderTopColor="border.subtle">
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="bold" color="fg" mb={2}>💬 Refine these results:</Field.Label>
            <Flex gap={4} width="full">
                <Input
                flex={1}
                p={4}
                variant="outline"
                borderColor="border.emphasized"
                placeholder="e.g. 'Too expensive', 'I prefer German cars'..."
                value={refineInput}
                onChange={(e) => setRefineInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRefine()}
                color="fg"
                css={{ "--focus-color": "colors.brand.focus", _focus: { ring: "2px", ringColor: "brand.focus" } }}
                />
                <Button
                onClick={handleRefine}
                disabled={isSearching}
                px={8}
                py={4}
                colorPalette="brand"
                fontWeight="bold"
                _disabled={{ bg: 'brand.muted', cursor: 'not-allowed' }}
                rounded="lg"
                >
                Update
                </Button>
            </Flex>
          </Field.Root>
          <Text mt={2} fontSize="xs" color="fg.muted">💡 Tip: Pin cars you like (📌) to keep them during updates.</Text>
        </Box>
      </Box>

      <ComparisonTable 
        cars={cars} 
        pinnedIndices={pinnedIndices} 
        onTogglePin={onTogglePin} 
      />

      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
        <Box gridColumn={{ lg: "span 1" }} bg="bg.panel" p={8} borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="brand.subtle" display="flex" flexDirection="column" justifyContent="space-between">
           <Box>
             <Heading as="h3" size="md" color="fg" mb={6} display="flex" alignItems="center" gap={2}>
               <span>🔍</span> Actions
             </Heading>
             <Text color="fg.muted" fontSize="sm" mb={8}>What would you like to do now?</Text>
           </Box>
           
           <Stack gap={4}>
             <Box 
                as="button"
                onClick={() => setShowCompare(true)}
                w="full"
                p={4}
                bg="bg.subtle"
                _hover={{ bg: 'bg.muted', transform: 'translateX(2px)' }}
                borderWidth="1px"
                borderColor="border"
                borderRadius="xl"
                textAlign="left"
                transition="all 0.2s"
             >
                <Text fontWeight="bold" color="brand.emphasized" mb={1}>📊 Detailed comparison</Text>
                <Text fontSize="xs" color="fg.muted">Compare two cars side-by-side in depth</Text>
             </Box>
             <Box 
                as="button"
                onClick={() => setShowAlternatives(true)}
                w="full"
                p={4}
                bg="bg.subtle"
                _hover={{ bg: 'bg.muted', transform: 'translateX(2px)' }}
                borderWidth="1px"
                borderColor="border"
                borderRadius="xl"
                textAlign="left"
                transition="all 0.2s"
             >
                <Text fontWeight="bold" color="brand.emphasized" mb={1}>🔄 Show alternatives</Text>
                <Text fontSize="xs" color="fg.muted">Find similar models based on your favorite</Text>
             </Box>
           </Stack>
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
    </Stack>
  );
}

export default ResultsContainer;
