import { useState } from 'react';
import { Box, Stack, Flex, Heading, Text, Button, NativeSelect, Dialog, SimpleGrid } from '@chakra-ui/react';
import type { Car } from '../App';
import { api } from '../utils/api';

interface DetailedComparisonProps {
  cars: Car[];
  onClose: () => void;
}

interface ComparisonResult {
  comparison: string;
  categories: {
    name: string;
    car1: string;
    car2: string;
    winner: 'car1' | 'car2' | 'none';
  }[];
  conclusion: string;
}

function DetailedComparison({ cars, onClose }: DetailedComparisonProps) {
  const [car1Name, setCar1Name] = useState('');
  const [car2Name, setCar2Name] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCompare = async () => {
    if (!car1Name || !car2Name) {
      alert('Please select two cars to compare');
      return;
    }
    if (car1Name === car2Name) {
      alert('Please select two different cars');
      return;
    }

    setIsLoading(true);
    setResult(null);
    const data = await api.post<{ comparison: ComparisonResult }>('/api/compare-cars', { car1: car1Name, car2: car2Name });
    if (data) {
      setResult(data.comparison);
    }
    setIsLoading(false);
  };

  return (
    <Dialog.Root open={true} onOpenChange={(e) => !e.open && onClose()} size="xl" scrollBehavior="inside">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content borderRadius="2xl" maxH="90vh" maxW="4xl" bg="bg.panel">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle" fontSize="2xl" fontWeight="bold" color="fg">
            📊 Detailed Comparison
            </Dialog.Header>
            <Dialog.CloseTrigger fontSize="lg" />
            
            <Dialog.Body p={8}>
            <Flex direction={{ base: 'column', sm: 'row' }} align="center" gap={4} justify="center" mb={8}>
                <NativeSelect.Root flex={1} size="lg">
                    <NativeSelect.Field
                        placeholder="First car..."
                        value={car1Name}
                        onChange={(e) => setCar1Name(e.target.value)}
                        color="fg"
                    >
                    {cars.map((car, i) => (
                        <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
                    ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>

                <Text fontSize="xl" fontWeight="bold" color="fg.subtle">VS</Text>
                
                <NativeSelect.Root flex={1} size="lg">
                    <NativeSelect.Field
                        placeholder="Second car..."
                        value={car2Name}
                        onChange={(e) => setCar2Name(e.target.value)}
                        color="fg"
                    >
                    {cars.map((car, i) => (
                        <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
                    ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Button
                onClick={handleCompare}
                disabled={isLoading}
                loading={isLoading}
                px={8}
                py={4}
                colorPalette="brand"
                fontWeight="bold"
                _disabled={{ bg: 'brand.muted' }}
                size="lg"
                >
                Compare
                </Button>
            </Flex>

            {result && (
                <Stack gap={8} align="stretch" animation="fade-in 0.5s">
                <Box p={4} bg="brand.subtle" borderLeftWidth="4px" borderLeftColor="brand.focus" color="brand.emphasized" fontStyle="italic">
                    {result.comparison}
                </Box>

                <Stack gap={6} align="stretch">
                    {result.categories.map((cat, i) => (
                    <Box key={i} borderWidth="1px" borderColor="border.subtle" borderRadius="xl" overflow="hidden">
                        <Box bg="bg.subtle" p={4} borderBottomWidth="1px" borderBottomColor="border.subtle">
                        <Heading as="h4" size="sm" color="fg">{cat.name}</Heading>
                        </Box>
                        <SimpleGrid columns={2}>
                        <Box p={4} borderRightWidth="1px" borderRightColor="border.subtle" bg={cat.winner === 'car1' ? 'green.50' : 'transparent'}>
                            <Text fontSize="xs" fontWeight="bold" color="fg.subtle" mb={1}>{car1Name}</Text>
                            <Text color="fg">{cat.car1}</Text>
                            {cat.winner === 'car1' && <Text fontSize="xs" fontWeight="bold" color="fg.success" mt={2}>🏆 Winner</Text>}
                        </Box>
                        <Box p={4} bg={cat.winner === 'car2' ? 'green.50' : 'transparent'}>
                            <Text fontSize="xs" fontWeight="bold" color="fg.subtle" mb={1}>{car2Name}</Text>
                            <Text color="fg">{cat.car2}</Text>
                            {cat.winner === 'car2' && <Text fontSize="xs" fontWeight="bold" color="fg.success" mt={2}>🏆 Winner</Text>}
                        </Box>
                        </SimpleGrid>
                    </Box>
                    ))}
                </Stack>

                <Box p={6} bg="gray.900" color="white" borderRadius="xl">
                    <Heading as="h4" size="md" mb={2} display="flex" alignItems="center" gap={2}>
                    <span>🏆</span> Conclusion
                    </Heading>
                    <Text color="gray.300" lineHeight="relaxed">{result.conclusion}</Text>
                </Box>
                </Stack>
            )}
            </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

export default DetailedComparison;
