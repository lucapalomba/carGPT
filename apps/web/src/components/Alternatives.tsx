import { useState } from 'react';
import { Box, VStack, Heading, Text, Button, Select, Input, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody } from '@chakra-ui/react';
import type { Car } from '../App';
import { api } from '../utils/api';

interface AlternativesProps {
  cars: Car[];
  onClose: () => void;
}

interface AlternativeCar {
  make: string;
  model: string;
  reason: string;
  advantages: string;
}

function Alternatives({ cars, onClose }: AlternativesProps) {
  const [selectedCar, setSelectedCar] = useState('');
  const [reason, setReason] = useState('');
  const [alternatives, setAlternatives] = useState<AlternativeCar[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!selectedCar) {
      alert('Please select a car');
      return;
    }

    setIsLoading(true);
    const data = await api.post<{ alternatives: AlternativeCar[] }>('/api/get-alternatives', { car: selectedCar, reason });
    if (data) {
      setAlternatives(data.alternatives);
    }
    setIsLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="2xl" maxH="90vh">
        <ModalHeader borderBottomWidth="1px" borderColor="gray.100" fontSize="2xl" fontWeight="bold">
          🔄 Similar Alternatives
        </ModalHeader>
        <ModalCloseButton fontSize="lg" />
        
        <ModalBody p={8} overflowY="auto">
          <VStack spacing={4} align="stretch" mb={6}>
            <Select
              placeholder="Select a car you like..."
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              size="lg"
            >
              {cars.map((car, i) => (
                <option key={i} value={`${car.make} ${car.model}`}>{car.make} {car.model}</option>
              ))}
            </Select>
            <Input
              placeholder="Why are you looking for alternatives? (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              size="lg"
            />
            <Button
              onClick={handleSearch}
              isDisabled={isLoading}
              isLoading={isLoading}
              loadingText="Searching..."
              w="full"
              py={4}
              bg="indigo.600"
              color="white"
              fontWeight="bold"
              _hover={{ bg: 'indigo.700' }}
              _disabled={{ bg: 'indigo.400' }}
              size="lg"
            >
              Find Alternatives
            </Button>
          </VStack>

          <VStack spacing={4} align="stretch">
            {alternatives.map((alt, i) => (
              <Box key={i} p={6} borderWidth="1px" borderColor="gray.100" borderRadius="xl" bg="gray.50" _hover={{ bg: 'white', shadow: 'md' }} transition="all 0.2s">
                <Heading as="h4" size="md" color="indigo.700" mb={2}>{i + 1}. {alt.make} {alt.model}</Heading>
                <VStack align="stretch" spacing={2} fontSize="sm">
                  <Text><Text as="strong" color="gray.700">Why consider it:</Text> {alt.reason}</Text>
                  <Text><Text as="strong" color="gray.700">Advantages:</Text> {alt.advantages}</Text>
                </VStack>
              </Box>
            ))}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default Alternatives;
