import { Box } from '@chakra-ui/react';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import InitialForm from './components/InitialForm';
import ResultsContainer from './components/ResultsContainer';
import { useCarSearch } from './hooks/useCarSearch';
import { usePinnedCars } from './hooks/usePinnedCars';

function App() {
  const {
    currentCars,
    analysisHistory,
    isSearching,
    view,
    handleSearch,
    refineSearch,
    resetSearch
  } = useCarSearch();

  const {
    pinnedIndices,
    togglePin,
    updatePinnedIndices,
    getPinnedCars
  } = usePinnedCars(currentCars);

  useEffect(() => {
    if (currentCars.length > 0) {
      updatePinnedIndices(currentCars);
    }
  }, [currentCars, updatePinnedIndices]);

  const handleRefineSearch = async (feedback: string) => {
    const pinnedCars = getPinnedCars();
    await refineSearch(feedback, pinnedCars);
  };

  return (
    <Box minH="100vh" bg="bg.muted" py={12} px={{ base: 4, sm: 6, lg: 8 }}>
      <Toaster position="top-right" />
      <Box maxW="7xl" mx="auto">
        {view === 'form' ? (
          <InitialForm onSearch={handleSearch} isSearching={isSearching} />
        ) : (
          <ResultsContainer 
            cars={currentCars} 
            analysisHistory={analysisHistory} 
            pinnedIndices={pinnedIndices}
            onTogglePin={togglePin}
            onRefine={handleRefineSearch}
            onNewSearch={resetSearch}
            isSearching={isSearching}
          />
        )}
      </Box>
    </Box>
  );
}

export default App;
