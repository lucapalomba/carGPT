import { Box, Table, Text, Flex, Button, Stack } from '@chakra-ui/react';
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
      <Table.Root size="sm" variant="outline" showColumnBorder={false}>
        <Table.Header>
          <Table.Row bg="gray.50">
            <Table.ColumnHeader p={6} borderBottomWidth="1px" borderColor="gray.200" bg="gray.50" position="sticky" left={0} zIndex={10} w="48" color="gray.700">Feature</Table.ColumnHeader>
            {cars.map((car, i) => (
              <Table.ColumnHeader key={i} p={6} borderBottomWidth="1px" borderColor="gray.200" minW="300px">
                <Flex justify="space-between" align="start" mb={4}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="indigo.500">Car {i + 1}</Text>
                  <Button
                    onClick={() => onTogglePin(i)}
                    size="xs"
                    px={3}
                    py={1}
                    rounded="full"
                    colorPalette="indigo"
                    variant={pinnedIndices.has(i) ? 'solid' : 'surface'}
                    _hover={{ bg: pinnedIndices.has(i) ? 'indigo.700' : 'indigo.100' }}
                  >
                    {pinnedIndices.has(i) ? '📌 Pinned' : '📌 Pin'}
                  </Button>
                </Flex>
                <Text fontSize="xl" fontWeight="bold" color="gray.900">{car.make} {car.model}</Text>
                <Text color="gray.500" fontWeight="normal">{car.year}</Text>
                <ImageCarousel images={car.images || []} />
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row bg="indigo.50" _hover={{ bg: 'indigo.100' }}>
            <Table.Cell p={6} fontWeight="bold" color="gray.700" bg="indigo.50" position="sticky" left={0} zIndex={5}>Why choose it</Table.Cell>
            {cars.map((car, i) => (
              <Table.Cell key={i} p={6} fontSize="sm" fontStyle="italic" color="gray.600" lineHeight="relaxed">
                {car.reason}
              </Table.Cell>
            ))}
          </Table.Row>
          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Type</Table.Cell>
            {cars.map((car, i) => <Table.Cell key={i} p={6} color="gray.700">{car.type}</Table.Cell>)}
          </Table.Row>
          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Price</Table.Cell>
            {cars.map((car, i) => <Table.Cell key={i} p={6} color="indigo.600" fontWeight="bold">{car.price}</Table.Cell>)}
          </Table.Row>

          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Strengths</Table.Cell>
            {cars.map((car, i) => (
              <Table.Cell key={i} p={6}>
                <Stack gap={1}>
                  {car && car.strengths && car.strengths.map((s, idx) => (
                    <Flex key={idx} fontSize="sm" color="green.700" align="start" gap={2}>
                        <Text as="span" mt={0.5}>✅</Text>
                        <Text as="span">{s}</Text>
                    </Flex>
                  ))}
                </Stack>
              </Table.Cell>
            ))}
          </Table.Row>
          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>Weaknesses</Table.Cell>
            {cars.map((car, i) => (
              <Table.Cell key={i} p={6}>
                <Stack gap={1}>
                  {car && car.weaknesses && car.weaknesses.map((w, idx) => (
                    <Flex key={idx} fontSize="sm" color="red.700" align="start" gap={2}>
                        <Text as="span" mt={0.5}>❌</Text>
                        <Text as="span">{w}</Text>
                    </Flex>
                  ))}
                </Stack>
              </Table.Cell>
            ))}
          </Table.Row>

          {allPropertyIds.map(id => {
            const label = cars.find(c => c.properties?.[id])?.properties?.[id]?.translatedLabel || id;
            
            return (
              <Table.Row key={id}>
                <Table.Cell p={6} fontWeight="bold" color="gray.700" bg="gray.50" position="sticky" left={0} zIndex={5}>{label}</Table.Cell>
                {cars.map((car, i) => (
                  <Table.Cell key={i} p={6} color="gray.700">
                    {car.properties?.[id]?.value || '-'}
                  </Table.Cell>
                ))}
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

export default ComparisonTable;
