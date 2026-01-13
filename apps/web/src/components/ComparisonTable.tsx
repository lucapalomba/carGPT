import { Box, Table, Thead, Tbody, Tr, Th, Td, Text, Flex, Button, List, ListItem, ListIcon } from '@chakra-ui/react';
import type { Car } from '../App';
import ImageCarousel from './ImageCarousel';

interface ComparisonTableProps {
  cars: Car[];
  pinnedIndices: Set<number>;
  onTogglePin: (index: number) => void;
}

function ComparisonTable({ cars, pinnedIndices, onTogglePin }: ComparisonTableProps) {
  const allPropertyIds = Array.from(new Set(
    cars.flatMap(car => car.properties ? Object.keys(car.properties) : [])
  ));

  return (
    <Box overflowX="auto" bg="white" borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="gray.200">
      <Table variant="simple">
        <Thead>
          <Tr bg="gray.50">
            <Th p={6} borderBottomWidth="1px" borderColor="gray.200" bg="gray.50" position="sticky" left={0} zIndex={10} w="48" color="gray.700">Feature</Th>
            {cars.map((car, i) => (
              <Th key={i} p={6} borderBottomWidth="1px" borderColor="gray.200" minW="300px">
                <Flex justify="space-between" align="start" mb={4}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="indigo.500">Car {i + 1}</Text>
                  <Button
                    onClick={() => onTogglePin(i)}
                    size="xs"
                    px={3}
                    py={1}
                    rounded="full"
                    bg={pinnedIndices.has(i) ? 'indigo.600' : 'indigo.50'}
                    color={pinnedIndices.has(i) ? 'white' : 'indigo.600'}
                    _hover={{ bg: pinnedIndices.has(i) ? 'indigo.700' : 'indigo.100' }}
                  >
                    {pinnedIndices.has(i) ? '📌 Pinned' : '📌 Pin'}
                  </Button>
                </Flex>
                <Text fontSize="xl" fontWeight="bold" color="gray.900">{car.make} {car.model}</Text>
                <Text color="gray.500" fontWeight="normal">{car.year}</Text>
                <ImageCarousel images={car.images || []} />
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          <Tr bg="indigo.50" _hover={{ bg: 'indigo.100' }}>
            <Td p={6} fontWeight="bold" color="gray.700" bg="indigo.50" position="sticky" left={0} zIndex={5}>Why choose it</Td>
            {cars.map((car, i) => (
              <Td key={i} p={6} fontSize="sm" fontStyle="italic" color="gray.600" lineHeight="relaxed">
                {car.reason}
              </Td>
            ))}
          </Tr>
          <Tr>
            <Td p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Type</Td>
            {cars.map((car, i) => <Td key={i} p={6} color="gray.700">{car.type}</Td>)}
          </Tr>
          <Tr>
            <Td p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Price</Td>
            {cars.map((car, i) => <Td key={i} p={6} color="indigo.600" fontWeight="bold">{car.price}</Td>)}
          </Tr>

          <Tr>
            <Td p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Strengths</Td>
            {cars.map((car, i) => (
              <Td key={i} p={6}>
                <List spacing={1}>
                  {car && car.strengths && car.strengths.map((s, idx) => (
                    <ListItem key={idx} fontSize="sm" color="green.700" display="flex" alignItems="start" gap={2}>
                        <ListIcon as={() => <Text as="span">✅</Text>} mt={1} />
                        <Text as="span">{s}</Text>
                    </ListItem>
                  ))}
                </List>
              </Td>
            ))}
          </Tr>
          <Tr>
            <Td p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Weaknesses</Td>
            {cars.map((car, i) => (
              <Td key={i} p={6}>
                <List spacing={1}>
                  {car && car.weaknesses && car.weaknesses.map((w, idx) => (
                    <ListItem key={idx} fontSize="sm" color="red.700" display="flex" alignItems="start" gap={2}>
                        <ListIcon as={() => <Text as="span">❌</Text>} mt={1} />
                        <Text as="span">{w}</Text>
                    </ListItem>
                  ))}
                </List>
              </Td>
            ))}
          </Tr>

          {allPropertyIds.map(id => {
            const label = cars.find(c => c.properties?.[id])?.properties?.[id]?.translatedLabel || id;
            
            return (
              <Tr key={id}>
                <Td p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>{label}</Td>
                {cars.map((car, i) => (
                  <Td key={i} p={6} color="gray.700">
                    {car.properties?.[id]?.value || '-'}
                  </Td>
                ))}
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

export default ComparisonTable;
