import dotenv from 'dotenv';
import readline from 'readline';
import { RAGService } from './rag-service';

dotenv.config();

async function main() {
  console.log('🧠 RAG Product Search Agent Starting...');

  const rag = new RAGService();

  console.log('✅ RAG agent ready! Ask product search questions.');
  console.log('Type "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }

      console.log('🤖 RAG: Thinking...');
      const response = await rag.searchProducts(input);
      console.log(`🤖 RAG: ${response}\n`);

      ask();
    });
  };

  ask();
}

main().catch(console.error);
