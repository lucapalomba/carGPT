import { useState } from 'react';
import { Box, Stack, Heading, Text, Textarea, Button, Image, Field } from '@chakra-ui/react';

interface InitialFormProps {
  onSearch: (requirements: string) => void;
  isSearching: boolean;
}

const EXAMPLES = [
  "Looking for a reliable family car with:\n- Space for 2 adults and 2 kids\n- Large trunk (3 suitcases minimum)\n- Good safety ratings\n- Economical for daily 50km commute\n- Budget: €25,000-35,000",
  "Need a compact car for city driving:\n- Easy to park\n- Low fuel consumption\n- Nimble in traffic\n- Budget-friendly (under €20k)\n- Hybrid preferred",
  "Looking for a robust SUV for outdoor adventures:\n- 4x4 capability\n- Good ground clearance\n- Reliable in tough conditions\n- Can handle dirt roads and snow\n- Budget: up to €40,000"
];

function InitialForm({ onSearch, isSearching }: InitialFormProps) {
  const [requirements, setRequirements] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requirements.trim().length < 10) {
      alert('Please describe your requirements in more detail (at least 10 characters)');
      return;
    }
    onSearch(requirements.trim());
  };

  return (
    <Box bg="white" p={8} borderRadius="2xl" shadow="xl" maxW="2xl" mx="auto">
      <Box textAlign="center" mb={8}>
        <Box display="flex" justifyContent="center" mb={4}>
          <Image src="/cargpt_logo.png" alt="CarGPT Logo" maxH="150px" objectFit="contain" />
        </Box>
        <Heading as="h1" size="xl" color="gray.900" mb={2}>CarGPT</Heading>
        <Text color="gray.600">Describe what you're looking for in a car and we'll suggest the perfect models for you</Text>
      </Box>

      <Stack as="form" gap={6} onSubmit={handleSubmit} align="stretch">
        <Field.Root>
          <Field.Label htmlFor="requirements" fontSize="sm" fontWeight="medium" color="gray.700" mb={1}>
            Describe your requirements
          </Field.Label>
          <Textarea
            id="requirements"
            rows={6}
            p={4}
            borderColor="gray.300"
            borderRadius="lg"
            placeholder="Example: Looking for a family car with space for 5 people..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            required
            css={{
                "--focus-color": "colors.indigo.500",
                _focus: { ring: "2px", ringColor: "indigo.500" }
            }}
          />
          <Text mt={2} fontSize="sm" color="gray.500">The more specific you are, the better the suggestions! 💡</Text>
        </Field.Root>

        <Stack gap={4} align="stretch">
          <Text fontWeight="semibold" color="gray.700">Example prompts:</Text>
          {EXAMPLES.map((example, idx) => (
            <Button
              key={idx}
              onClick={() => setRequirements(example)}
              variant="outline"
              bg="gray.50"
              borderColor="gray.200"
              textAlign="left"
              h="auto"
              whiteSpace="pre-wrap"
              p={4}
              fontSize="sm"
              fontWeight="normal"
              justifyContent="flex-start"
            >
              {example}
            </Button>
          ))}
        </Stack>

        <Button
          type="submit"
          disabled={isSearching}
          loading={isSearching}
          w="full"
          py={7} // increased height for emphasis
          colorPalette="blue"
          fontWeight="bold"
          shadow="md"
          rounded="lg"
        >
          {isSearching ? "Analyzing your requirements..." : "Find my perfect cars"}
        </Button>
      </Stack>
    </Box>
  );
}

export default InitialForm;
