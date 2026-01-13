import { useState } from 'react';
import { Box, VStack, Flex, Heading, Text, Button, Select, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, SimpleGrid } from '@chakra-ui/react';
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
    <Modal isOpen={true} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="2xl" maxH="90vh">
        <ModalHeader borderBottomWidth="1px" borderColor="gray.100" fontSize="2xl" fontWeight="bold">
          📊 Detailed Comparison
        </ModalHeader>
        <ModalCloseButton fontSize="lg" />
        
        <ModalBody p={8} overflowY="auto">
          <Flex direction={{ base: 'column', sm: 'row' }} align="center" gap={4} justify="center" mb={8}>
            <Select
              placeholder="First car..."
              value={car1Name}
              onChange={(e) => setCar1Name(e.target.value)}
              flex={1}
              size="lg"
            >
              {cars.map((car, i) => (
                <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
              ))}
            </Select>
            <Text fontSize="xl" fontWeight="bold" color="gray.400">VS</Text>
            <Select
              placeholder="Second car..."
              value={car2Name}
              onChange={(e) => setCar2Name(e.target.value)}
              flex={1}
              size="lg"
            >
              {cars.map((car, i) => (
                <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
              ))}
            </Select>
            <Button
              onClick={handleCompare}
              isDisabled={isLoading}
              isLoading={isLoading}
              loadingText="Comparing..."
              px={8}
              py={4}
              bg="indigo.600"
              color="white"
              fontWeight="bold"
              _hover={{ bg: 'indigo.700' }}
              _disabled={{ bg: 'indigo.400' }}
              size="lg"
            >
              Compare
            </Button>
          </Flex>

          {result && (
            <VStack spacing={8} align="stretch" animation="fade-in 0.5s">
              <Box p={4} bg="indigo.50" borderLeftWidth="4px" borderLeftColor="indigo.500" color="indigo.900" fontStyle="italic">
                {result.comparison}
              </Box>

              <VStack spacing={6} align="stretch">
                {result.categories.map((cat, i) => (
                  <Box key={i} borderWidth="1px" borderColor="gray.100" borderRadius="xl" overflow="hidden">
                    <Box bg="gray.50" p={4} borderBottomWidth="1px" borderBottomColor="gray.100">
                      <Heading as="h4" size="sm" color="gray.700">{cat.name}</Heading>
                    </Box>
                    <SimpleGrid columns={2}>
                      <Box p={4} borderRightWidth="1px" borderRightColor="gray.100" bg={cat.winner === 'car1' ? 'green.50' : 'transparent'}>
                        <Text fontSize="xs" fontWeight="bold" color="gray.400" mb={1}>{car1Name}</Text>
                        <Text color="gray.700">{cat.car1}</Text>
                        {cat.winner === 'car1' && <Text fontSize="xs" fontWeight="bold" color="green.600" mt={2}>🏆 Winner</Text>}
                      </Box>
                      <Box p={4} bg={cat.winner === 'car2' ? 'green.50' : 'transparent'}>
                        <Text fontSize="xs" fontWeight="bold" color="gray.400" mb={1}>{car2Name}</Text>
                        <Text color="gray.700">{cat.car2}</Text>
                        {cat.winner === 'car2' && <Text fontSize="xs" fontWeight="bold" color="green.600" mt={2}>🏆 Winner</Text>}
                      </Box>
                    </SimpleGrid>
                  </Box>
                ))}
              </VStack>

              <Box p={6} bg="gray.900" color="white" borderRadius="xl">
                <Heading as="h4" size="md" mb={2} display="flex" alignItems="center" gap={2}>
                  <span>🏆</span> Conclusion
                </Heading>
                <Text color="gray.300" lineHeight="relaxed">{result.conclusion}</Text>
              </Box>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default DetailedComparison;
