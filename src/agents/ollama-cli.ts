import { OllamaInventoryAgent } from './ollama-agent';
import readline from 'readline';

async function main() {
  console.log('🦙 Starting Ollama Inventory Agent...');
  console.log('💡 Make sure Ollama is running: ollama serve');
  console.log('📦 Required model: ollama pull llama3.1:8b');
  console.log('Type "exit" to quit\n');

  const agent = new OllamaInventoryAgent();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        rl.close();
        return;
      }

      try {
        console.log('🦙 Agent: Thinking...');
        const response = await agent.chat(input);
        console.log(`🦙 Agent: ${response}\n`);
      } catch (error) {
        console.error('❌ Error:', error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);
