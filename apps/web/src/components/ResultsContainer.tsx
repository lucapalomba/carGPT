import { useState, useRef, useEffect } from 'react';
import { Box, Stack, Flex, Heading, Text, Button, Field, Input } from '@chakra-ui/react';
import type { Car } from '../hooks/useCarSearch';
import ComparisonTable from './ComparisonTable';


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
    </Stack>
  );
}

export default ResultsContainer;
