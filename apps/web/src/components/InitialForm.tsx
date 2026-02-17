import { useState, createContext, useContext } from 'react';
import { Box, Stack, Heading, Text, Textarea, Button, Image, Field } from '@chakra-ui/react';
import { toast } from 'react-hot-toast';
import { EXAMPLES } from '../constants/examples';

// Context for compound components
interface InitialFormContextValue {
  requirements: string;
  setRequirements: (val: string) => void;
  isSearching: boolean;
  onSearch: (requirements: string) => void;
}

const InitialFormContext = createContext<InitialFormContextValue | null>(null);

function useInitialForm() {
  const context = useContext(InitialFormContext);
  if (!context) {
    throw new Error('InitialForm components must be used within an InitialForm.Root');
  }
  return context;
}

interface InitialFormRootProps {
  children: React.ReactNode;
  onSearch: (requirements: string) => void;
  isSearching: boolean;
}

const InitialFormRoot = ({ children, onSearch, isSearching }: InitialFormRootProps) => {
  const [requirements, setRequirements] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requirements.trim().length < 10) {
      toast.error('Please describe your requirements in more detail (at least 10 characters)');
      return;
    }
    onSearch(requirements.trim());
  };

  return (
    <InitialFormContext.Provider value={{ requirements, setRequirements, isSearching, onSearch }}>
      <Box 
        bg="bg.panel" 
        p={8} 
        borderRadius="2xl" 
        shadow="xl" 
        maxW="2xl" 
        mx="auto"
        as="form"
        onSubmit={handleSubmit}
      >
        <Stack gap={6} align="stretch">
          {children}
        </Stack>
      </Box>
    </InitialFormContext.Provider>
  );
};

const InitialFormHeader = () => (
  <Box textAlign="center" mb={2}>
    <Box display="flex" justifyContent="center" mb={4}>
      <Image 
        src="/cargpt_logo.png" 
        alt="CarGPT Logo" 
        maxH="150px" 
        width="150px" // Added width for CLS
        height="150px" // Added height for CLS
        objectFit="contain" 
      />
    </Box>
    <Heading as="h1" size="xl" color="fg" mb={2}>CarGPT</Heading>
    <Text color="fg.muted">Describe what you're looking for in a car and we'll suggest the perfect models for you</Text>
  </Box>
);

const InitialFormInput = () => {
  const { requirements, setRequirements } = useInitialForm();
  
  return (
    <Field.Root>
      <Field.Label htmlFor="requirements" fontSize="sm" fontWeight="medium" color="fg" mb={1}>
        Describe your requirements
      </Field.Label>
      <Textarea
        id="requirements"
        name="requirements"
        rows={6}
        p={4}
        borderColor="border.emphasized"
        borderRadius="lg"
        placeholder="Example: Looking for a family car with space for 5 people…"
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
        color="fg"
        required
        autoComplete="off"
        aria-describedby="requirements-help"
        aria-required="true"
        aria-invalid={requirements.trim().length > 0 && requirements.trim().length < 10}
        css={{
          "--focus-color": "colors.brand.focus",
          _focus: { ring: "2px", ringColor: "brand.focus" }
        }}
      />
      <Text mt={2} fontSize="sm" color="fg.muted" id="requirements-help">The more specific you are, the better the suggestions! 💡</Text>
    </Field.Root>
  );
};

const InitialFormExamples = () => {
  const { setRequirements } = useInitialForm();
  
  return (
    <Stack gap={4} align="stretch">
      <Text fontWeight="semibold" color="fg">Example prompts:</Text>
      {EXAMPLES.map((example, idx) => (
        <Button
          key={idx}
          type="button" // Specified type to avoid form submission
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
  );
};

const InitialFormSubmit = () => {
  const { isSearching } = useInitialForm();
  
  return (
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
      {isSearching ? "Analyzing your requirements…" : "Find my perfect cars"}
    </Button>
  );
};

// Main component using compound parts
interface InitialFormProps {
  onSearch: (requirements: string) => void;
  isSearching: boolean;
}

function InitialForm({ onSearch, isSearching }: InitialFormProps) {
  return (
    <InitialFormRoot onSearch={onSearch} isSearching={isSearching}>
      <InitialFormHeader />
      <InitialFormInput />
      <InitialFormExamples />
      <InitialFormSubmit />
    </InitialFormRoot>
  );
}

// Export compound components for flexibility
InitialForm.Root = InitialFormRoot;
InitialForm.Header = InitialFormHeader;
InitialForm.Input = InitialFormInput;
InitialForm.Examples = InitialFormExamples;
InitialForm.Submit = InitialFormSubmit;

export default InitialForm;
