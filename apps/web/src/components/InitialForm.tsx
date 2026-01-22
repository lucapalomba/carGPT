import { useState } from 'react';
import { Box, Stack, Heading, Text, Textarea, Button, Image, Field } from '@chakra-ui/react';
import { EXAMPLES } from '../constants/examples';

interface InitialFormProps {
  onSearch: (requirements: string) => void;
  isSearching: boolean;
}

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
    <Box bg="bg.panel" p={8} borderRadius="2xl" shadow="xl" maxW="2xl" mx="auto">
      <Box textAlign="center" mb={8}>
        <Box display="flex" justifyContent="center" mb={4}>
          <Image src="/cargpt_logo.png" alt="CarGPT Logo" maxH="150px" objectFit="contain" />
        </Box>
        <Heading as="h1" size="xl" color="fg" mb={2}>CarGPT</Heading>
        <Text color="fg.muted">Describe what you're looking for in a car and we'll suggest the perfect models for you</Text>
      </Box>

      <Stack as="form" gap={6} onSubmit={handleSubmit} align="stretch">
        <Field.Root>
          <Field.Label htmlFor="requirements" fontSize="sm" fontWeight="medium" color="fg" mb={1}>
            Describe your requirements
          </Field.Label>
          <Textarea
            id="requirements"
            rows={6}
            p={4}
            borderColor="border.emphasized"
            borderRadius="lg"
            placeholder="Example: Looking for a family car with space for 5 people..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            color="fg"
            required
            css={{
                "--focus-color": "colors.brand.focus",
                _focus: { ring: "2px", ringColor: "brand.focus" }
            }}
          />
          <Text mt={2} fontSize="sm" color="fg.muted">The more specific you are, the better the suggestions! 💡</Text>
        </Field.Root>

        <Stack gap={4} align="stretch">
          <Text fontWeight="semibold" color="fg">Example prompts:</Text>
          {EXAMPLES.map((example, idx) => (
            <Button
              key={idx}
              onClick={() => setRequirements(example)}
              variant="outline"
              bg="bg.subtle"
              borderColor="border"
              textAlign="left"
              h="auto"
              whiteSpace="pre-wrap"
              p={4}
              fontSize="sm"
              fontWeight="normal"
              justifyContent="flex-start"
              color="fg"
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
          py={7}
          colorPalette="brand"
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
