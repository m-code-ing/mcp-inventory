import { GroqInventoryAgent } from './groq-agent';
import readline from 'readline';

async function main() {
  console.log('⚡ Starting Groq Inventory Agent...');
  console.log('💡 Make sure you have GROQ_API_KEY in your .env file');
  console.log('🚀 Fast cloud inference with free tier available');
  console.log('Type "exit" to quit\n');

  const agent = new GroqInventoryAgent();

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
        console.log('⚡ Agent: Thinking...');
        const response = await agent.chat(input);
        console.log(`⚡ Agent: ${response}\n`);
      } catch (error) {
        console.error('❌ Error:', error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);
