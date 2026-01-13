import { useState, useRef, useEffect } from 'react';
import { Box, Stack, Flex, Heading, Text, Button, NativeSelect, Input, Spinner, Center } from '@chakra-ui/react';
import type { Car } from '../App';
import { api } from '../utils/api';

interface QASectionProps {
  cars: Car[];
}

interface QAMessage {
  type: 'question' | 'answer';
  text: string;
  carName?: string;
  isError?: boolean;
}

function QASection({ cars }: QASectionProps) {
  const [selectedCarIdx, setSelectedCarIdx] = useState('');
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const handleAsk = async () => {
    if (!selectedCarIdx || !question.trim()) {
      alert('Please select a car and write a question');
      return;
    }

    const car = cars[parseInt(selectedCarIdx)];
    const carName = `${car.make} ${car.model}`;
    const userQuestion = question.trim();

    setHistory(prev => [...prev, { type: 'question', text: userQuestion, carName }]);
    setQuestion('');
    setIsLoading(true);

    const data = await api.post<{ answer: string }>('/api/ask-about-car', { car: carName, question: userQuestion });
    if (data) {
      setHistory(prev => [...prev, { type: 'answer', text: data.answer }]);
    } else {
      // api utility already toasted the error, we just add it to history for UI flow
      setHistory(prev => [...prev, { type: 'answer', text: 'Operation failed', isError: true }]);
    }
    setIsLoading(false);
  };

  return (
    <Flex direction="column" h="500px" bg="bg.panel" p={8} borderRadius="xl" shadow="lg" borderWidth="1px" borderColor="border.subtle">
      <Heading as="h3" size="md" color="fg" mb={6} display="flex" alignItems="center" gap={2}>
        <span>💬</span> Have questions about these cars?
      </Heading>

      <Stack gap={4} mb={6} align="stretch">
        <Flex gap={3} direction={{ base: 'column', sm: 'row' }}>
          <NativeSelect.Root flex={2} size="md">
            <NativeSelect.Field
                value={selectedCarIdx}
                onChange={(e) => setSelectedCarIdx(e.target.value)}
                placeholder="Select a car..."
                borderRadius="lg"
                color="fg"
            >
                {cars.map((car, i) => (
                <option key={i} value={i}>{car.make} {car.model}</option>
                ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Input
            flex={5}
            placeholder="e.g. What's the annual maintenance cost?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
            size="md"
            borderRadius="lg"
            color="fg"
          />
          <Button
            onClick={handleAsk}
            disabled={isLoading}
            flex={1}
            colorPalette="brand"
            fontWeight="bold"
            _disabled={{ bg: 'brand.muted' }}
            size="md"
            borderRadius="lg"
          >
            Ask
          </Button>
        </Flex>
      </Stack>

      <Box 
        ref={historyRef}
        flex={1}
        overflowY="auto"
        p={4}
        bg="bg.canvas"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="border.subtle"
      >
        {history.length === 0 && (
          <Center h="full">
            <Text color="fg.subtle" fontStyle="italic">
              Questions and answers will appear here
            </Text>
          </Center>
        )}
        <Stack gap={4} align="stretch">
          {history.map((msg, i) => (
            <Flex 
              key={i} 
              direction="column" 
              alignItems={msg.type === 'question' ? 'flex-end' : 'flex-start'}
            >
              <Box 
                maxW="85%" 
                p={4} 
                borderRadius="2xl" 
                borderTopRightRadius={msg.type === 'question' ? 0 : '2xl'}
                borderTopLeftRadius={msg.type === 'question' ? '2xl' : 0}
                bg={msg.type === 'question' ? 'brand.solid' : msg.isError ? 'red.50' : 'bg.panel'}
                color={msg.type === 'question' ? 'brand.contrast' : msg.isError ? 'red.700' : 'fg'}
                borderWidth={msg.type !== 'question' ? '1px' : 0}
                borderColor={msg.isError ? 'red.100' : 'border.subtle'}
                boxShadow={msg.type !== 'question' ? 'sm' : 'none'}
              >
                {msg.type === 'question' && (
                  <Text fontSize="10px" fontWeight="bold" textTransform="uppercase" opacity={0.7} mb={1}>{msg.carName}</Text>
                )}
                <Text whiteSpace="pre-wrap" fontSize="sm">{msg.text}</Text>
              </Box>
            </Flex>
          ))}
          {isLoading && (
            <Flex align="start">
              <Box bg="bg.panel" p={4} borderRadius="2xl" borderTopLeftRadius={0} shadow="sm" borderWidth="1px" borderColor="border.subtle" display="flex" alignItems="center" gap={3}>
                <Spinner size="sm" color="fg.subtle" />
                <Text fontSize="xs" color="fg.subtle" fontStyle="italic">Thinking...</Text>
              </Box>
            </Flex>
          )}
        </Stack>
      </Box>
    </Flex>
  );
}

export default QASection;
