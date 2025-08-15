import { InventoryLLMAgent } from './llm-agent';
import readline from 'readline';

async function main() {
  console.log('🤖 Inventory LLM Agent Starting...');

  const agent = new InventoryLLMAgent();

  console.log('✅ Agent ready! You can now ask questions about your inventory.');
  console.log('Examples:');
  console.log('- "Fetch my latest inventory"');
  console.log('- "How many products do I have?"');
  console.log('- "Which products are low in stock?"');
  console.log('- "What\'s my total inventory value?"');
  console.log('\\nType "exit" to quit.\\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('Goodbye!');

        rl.close();
        process.exit(0);
      }

      console.log('🤖 Agent: Thinking...');
      const response = await agent.chat(input);
      console.log(`🤖 Agent: ${response}\\n`);

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);
