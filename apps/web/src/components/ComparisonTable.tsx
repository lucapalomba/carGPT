import React, { createContext, useContext } from 'react';
import { Box, Table, Text, Flex, Button, Stack, Badge } from '@chakra-ui/react';
import type { Car } from '../hooks/useCarSearch';
import ImageCarousel from './ImageCarousel';

// Context interface for compound components
interface ComparisonTableContextValue {
  cars: Car[];
  pinnedIndices: Set<number>;
  onTogglePin: (index: number) => void;
  allPropertyIds: string[];
}

const ComparisonTableContext = createContext<ComparisonTableContextValue | null>(null);

// Provider component
interface ComparisonTableProviderProps {
  children: React.ReactNode;
  cars: Car[];
  pinnedIndices: Set<number>;
  onTogglePin: (index: number) => void;
}

function ComparisonTableProvider({ 
  children, 
  cars, 
  pinnedIndices, 
  onTogglePin 
}: ComparisonTableProviderProps) {
  const allPropertyIds = Array.from(new Set(
    cars.flatMap(car => car.vehicle_properties ? Object.keys(car.vehicle_properties) : [])
  ));

  return (
    <ComparisonTableContext.Provider value={{ 
      cars, 
      pinnedIndices, 
      onTogglePin, 
      allPropertyIds 
    }}>
      {children}
    </ComparisonTableContext.Provider>
  );
}

// Hook to use context
function useComparisonTable() {
  const context = useContext(ComparisonTableContext);
  if (!context) {
    throw new Error('ComparisonTable components must be used within a ComparisonTableProvider');
  }
  return context;
}

// Root component
function ComparisonTableRoot({ children }: { children: React.ReactNode }) {
  return (
    <Box overflowX="auto" bg="bg.panel" borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="border">
      <Table.Root size="sm" variant="outline" showColumnBorder={false}>
        {children}
      </Table.Root>
    </Box>
  );
}

// Header component
function ComparisonTableHeader() {
  const { cars, pinnedIndices, onTogglePin } = useComparisonTable();

  return (
    <Table.Header>
      <Table.Row bg="bg.subtle">
        <Table.ColumnHeader p={6} borderBottomWidth="1px" borderColor="border" bg="bg.subtle" position="sticky" left={0} zIndex={10} w="48" color="fg">
          Feature
        </Table.ColumnHeader>
        {cars.map((car, i) => (
          <Table.ColumnHeader key={i} p={6} borderBottomWidth="1px" borderColor="border" minW="300px" data-testid="car-card">
            <Flex justify="space-between" align="start" mb={4}>
              <Badge variant="solid" size="lg" colorPalette={(car.percentage || 0) > 80 ? 'green' : (car.percentage || 0) > 50 ? 'orange' : 'red'}>
                {car.percentage || 0}
              </Badge>
              <Button
                onClick={() => onTogglePin(i)}
                size="xs"
                px={3}
                py={1}
                rounded="full"
                colorPalette="brand"
                variant={pinnedIndices.has(i) ? 'solid' : 'surface'}
                _hover={{ bg: pinnedIndices.has(i) ? 'brand.emphasized' : 'brand.muted' }}
                aria-label={pinnedIndices.has(i) ? 'Unpin car' : 'Pin car'}
                touchAction="manipulation"
              >
                {pinnedIndices.has(i) ? '📌 Pinned' : '📌 Pin'}
              </Button>
            </Flex>
            <Text fontSize="xl" fontWeight="bold" color="fg" data-testid="car-name">
              {car.make} {car.model}
            </Text>
            <Text fontSize="xs" fontWeight="light" color="fg">{car.precise_model}</Text>
            <Text color="fg.muted" fontWeight="normal">{car.year}</Text>
            <ImageCarousel images={car.images || []} aria-label={`Images for ${car.make} ${car.model}`} />
          </Table.ColumnHeader>
        ))}
      </Table.Row>
    </Table.Header>
  );
}

// Body component
function ComparisonTableBody({ children }: { children: React.ReactNode }) {
  return <Table.Body>{children}</Table.Body>;
}

// Row component
function ComparisonTableRow({ 
  feature, 
  featureBg, 
  children 
}: { 
  feature: string;
  featureBg?: string;
  children: React.ReactNode;
}) {
  return (
    <Table.Row bg={featureBg} _hover={{ bg: 'brand.muted' }}>
      <Table.Cell p={6} fontWeight="bold" color="fg" bg={featureBg || 'bg.subtle'} position="sticky" left={0} zIndex={5}>
        {feature}
      </Table.Cell>
      {children}
    </Table.Row>
  );
}

// Car cell component
function ComparisonCarCell({ children }: { children: React.ReactNode }) {
  return (
    <Table.Cell p={6} color="fg">
      {children}
    </Table.Cell>
  );
}

// Specific row components
function ComparisonReasonRow() {
  const { cars } = useComparisonTable();

  return (
    <ComparisonTableRow feature="Why choose it" featureBg="brand.subtle">
      {cars.map((car, i) => (
        <ComparisonCarCell key={i}>
          <Text fontSize="sm" fontStyle="italic" color="fg.muted" lineHeight="relaxed">
            {car.reason}
          </Text>
        </ComparisonCarCell>
      ))}
    </ComparisonTableRow>
  );
}

function ComparisonTypeRow() {
  const { cars } = useComparisonTable();

  return (
    <ComparisonTableRow feature="Type">
      {cars.map((car, i) => (
        <ComparisonCarCell key={i}>
          {car.type}
        </ComparisonCarCell>
      ))}
    </ComparisonTableRow>
  );
}

function ComparisonPriceRow() {
  const { cars } = useComparisonTable();

  return (
    <ComparisonTableRow feature="Price">
      {cars.map((car, i) => (
        <ComparisonCarCell key={i}>
          <Text color="brand.emphasized" fontWeight="bold" fontVariantNumeric="tabular-nums">{car.price}</Text>
        </ComparisonCarCell>
      ))}
    </ComparisonTableRow>
  );
}

function ComparisonStrengthsRow() {
  const { cars } = useComparisonTable();

  return (
    <ComparisonTableRow feature="Strengths">
      {cars.map((car, i) => (
        <ComparisonCarCell key={i}>
          <Stack gap={1}>
            {car && car.strengths && car.strengths.map((s: string, idx: number) => (
              <Flex key={idx} fontSize="sm" color="fg.success" align="start" gap={2}>
                <Text as="span" mt={0.5}>✅</Text>
                <Text as="span">{s}</Text>
              </Flex>
            ))}
          </Stack>
        </ComparisonCarCell>
      ))}
    </ComparisonTableRow>
  );
}

function ComparisonWeaknessesRow() {
  const { cars } = useComparisonTable();

  return (
    <ComparisonTableRow feature="Weaknesses">
      {cars.map((car, i) => (
        <ComparisonCarCell key={i}>
          <Stack gap={1}>
            {car && car.weaknesses && car.weaknesses.map((w: string, idx: number) => (
              <Flex key={idx} fontSize="sm" color="fg.error" align="start" gap={2}>
                <Text as="span" mt={0.5}>❌</Text>
                <Text as="span">{w}</Text>
              </Flex>
            ))}
          </Stack>
        </ComparisonCarCell>
      ))}
    </ComparisonTableRow>
  );
}

function ComparisonPropertiesRows() {
  const { cars, allPropertyIds } = useComparisonTable();

  return (
    <>
      {allPropertyIds.map(id => {
        const label = cars.find(c => c.vehicle_properties?.[id])?.vehicle_properties?.[id]?.translatedLabel || id;
        
        return (
          <ComparisonTableRow key={id} feature={label}>
            {cars.map((car, i) => (
              <ComparisonCarCell key={i}>
                <Text fontVariantNumeric="tabular-nums">
                  {car.vehicle_properties?.[id]?.value || '-'}
                </Text>
              </ComparisonCarCell>
            ))}
          </ComparisonTableRow>
        );
      })}
    </>
  );
}

// Export compound component
const ComparisonTable = {
  Provider: ComparisonTableProvider,
  Root: ComparisonTableRoot,
  Header: ComparisonTableHeader,
  Body: ComparisonTableBody,
  Row: ComparisonTableRow,
  CarCell: ComparisonCarCell,
  ReasonRow: ComparisonReasonRow,
  TypeRow: ComparisonTypeRow,
  PriceRow: ComparisonPriceRow,
  StrengthsRow: ComparisonStrengthsRow,
  WeaknessesRow: ComparisonWeaknessesRow,
  PropertiesRows: ComparisonPropertiesRows,
};

export default ComparisonTable;
export { ComparisonTableProvider, ComparisonTableRoot };