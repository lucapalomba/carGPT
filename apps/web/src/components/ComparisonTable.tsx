import { Box, Table, Text, Flex, Button, Stack, Badge } from '@chakra-ui/react';
import type { Car } from '../hooks/useCarSearch';
import ImageCarousel from './ImageCarousel';

interface ComparisonTableProps {
  cars: Car[];
  pinnedIndices: Set<number>;
  onTogglePin: (index: number) => void;
}

function ComparisonTable({ cars, pinnedIndices, onTogglePin }: ComparisonTableProps) {
  const allPropertyIds = Array.from(new Set(
    cars.flatMap(car => car.vehicle_properties ? Object.keys(car.vehicle_properties) : [])
  ));

  return (
    <Box overflowX="auto" bg="bg.panel" borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="border">
      <Table.Root size="sm" variant="outline" showColumnBorder={false}>
        <Table.Header>
          <Table.Row bg="bg.subtle">
            <Table.ColumnHeader p={6} borderBottomWidth="1px" borderColor="border" bg="bg.subtle" position="sticky" left={0} zIndex={10} w="48" color="fg">Feature</Table.ColumnHeader>
            {cars.map((car, i) => (
              <Table.ColumnHeader key={i} p={6} borderBottomWidth="1px" borderColor="border" minW="300px" data-testid="car-card">
                <Flex justify="space-between" align="start" mb={4}>
                  <Badge variant="solid"  size="lg"  colorPalette={(car.percentage || 0) > 80 ? 'green' : (car.percentage || 0) > 50 ? 'orange' : 'red'}>{car.percentage || 0}</Badge>
                  <Button
                    onClick={() => onTogglePin(i)}
                    size="xs"
                    px={3}
                    py={1}
                    rounded="full"
                    colorPalette="brand"
                    variant={pinnedIndices.has(i) ? 'solid' : 'surface'}
                    _hover={{ bg: pinnedIndices.has(i) ? 'brand.emphasized' : 'brand.muted' }}
                  >
                    {pinnedIndices.has(i) ? '📌 Pinned' : '📌 Pin'}
                  </Button>
                </Flex>
                <Text fontSize="xl" fontWeight="bold" color="fg" data-testid="car-name">{car.make} {car.model}</Text>
                <Text fontSize="xs" fontWeight="light" color="fg">{car.precise_model}</Text>
                <Text color="fg.muted" fontWeight="normal">{car.year}</Text>
                <ImageCarousel images={car.images || []} />
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row bg="brand.subtle" _hover={{ bg: 'brand.muted' }}>
            <Table.Cell p={6} fontWeight="bold" color="fg" bg="brand.subtle" position="sticky" left={0} zIndex={5}>Why choose it</Table.Cell>
            {cars.map((car, i) => (
              <Table.Cell key={i} p={6} fontSize="sm" fontStyle="italic" color="fg.muted" lineHeight="relaxed">
                {car.reason}
              </Table.Cell>
            ))}
          </Table.Row>
          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="fg" bg="bg.subtle" position="sticky" left={0} zIndex={5}>Type</Table.Cell>
            {cars.map((car, i) => <Table.Cell key={i} p={6} color="fg">{car.type}</Table.Cell>)}
          </Table.Row>
          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="fg" bg="bg.subtle" position="sticky" left={0} zIndex={5}>Price</Table.Cell>
            {cars.map((car, i) => <Table.Cell key={i} p={6} color="brand.emphasized" fontWeight="bold">{car.price}</Table.Cell>)}
          </Table.Row>

          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="fg" bg="bg.subtle" position="sticky" left={0} zIndex={5}>Strengths</Table.Cell>
            {cars.map((car, i) => (
              <Table.Cell key={i} p={6}>
                <Stack gap={1}>
                  {car && car.strengths && car.strengths.map((s: string, idx: number) => (
                    <Flex key={idx} fontSize="sm" color="fg.success" align="start" gap={2}>
                        <Text as="span" mt={0.5}>✅</Text>
                        <Text as="span">{s}</Text>
                    </Flex>
                  ))}
                </Stack>
              </Table.Cell>
            ))}
          </Table.Row>
          <Table.Row>
            <Table.Cell p={6} fontWeight="bold" color="fg" bg="bg.subtle" position="sticky" left={0} zIndex={5}>Weaknesses</Table.Cell>
            {cars.map((car, i) => (
              <Table.Cell key={i} p={6}>
                <Stack gap={1}>
                  {car && car.weaknesses && car.weaknesses.map((w: string, idx: number) => (
                    <Flex key={idx} fontSize="sm" color="fg.error" align="start" gap={2}>
                        <Text as="span" mt={0.5}>❌</Text>
                        <Text as="span">{w}</Text>
                    </Flex>
                  ))}
                </Stack>
              </Table.Cell>
            ))}
          </Table.Row>

          {allPropertyIds.map(id => {
            const label = cars.find(c => c.vehicle_properties?.[id])?.vehicle_properties?.[id]?.translatedLabel || id;
            
            return (
              <Table.Row key={id}>
                <Table.Cell p={6} fontWeight="bold" color="fg" bg="bg.subtle" position="sticky" left={0} zIndex={5}>{label}</Table.Cell>
                {cars.map((car, i) => (
                  <Table.Cell key={i} p={6} color="fg">
                    {car.vehicle_properties?.[id]?.value || '-'}
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
