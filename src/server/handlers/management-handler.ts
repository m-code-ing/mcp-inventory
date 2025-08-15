import fs from 'fs';
import path from 'path';

export async function handleManagement(args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const { action, target, data } = args;

  switch (action) {
    case 'cleanup':
      return handleCleanup();
    
    case 'archive':
      return handleArchive(target);
    
    case 'delete':
      return handleDelete(target);
    
    case 'update':
      return handleUpdate(target, data);
    
    default:
      return {
        content: [{ type: 'text', text: `Unknown management action: ${action}` }],
        isError: true,
      };
  }
}

async function handleCleanup(): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const cachedDir = './shopify/inventory/cached';
    
    if (!fs.existsSync(cachedDir)) {
      return {
        content: [{ type: 'text', text: 'No cached directory found.' }],
      };
    }

    const files = fs.readdirSync(cachedDir);
    const oldFiles = files.filter(file => {
      const filePath = path.join(cachedDir, file);
      const stats = fs.statSync(filePath);
      const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceModified > 30; // Older than 30 days
    });

    for (const file of oldFiles) {
      fs.unlinkSync(path.join(cachedDir, file));
    }

    return {
      content: [{
        type: 'text',
        text: `Cleanup completed. Removed ${oldFiles.length} files older than 30 days.`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

async function handleArchive(target?: string): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return {
    content: [{
      type: 'text',
      text: 'Archive functionality not yet implemented.',
    }],
    isError: true,
  };
}

async function handleDelete(target?: string): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  if (!target) {
    return {
      content: [{ type: 'text', text: 'Delete target not specified.' }],
      isError: true,
    };
  }

  try {
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
      return {
        content: [{
          type: 'text',
          text: `Successfully deleted: ${target}`,
        }],
      };
    } else {
      return {
        content: [{ type: 'text', text: `File not found: ${target}` }],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

async function handleUpdate(target?: string, data?: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return {
    content: [{
      type: 'text',
      text: 'Update functionality not yet implemented.',
    }],
    isError: true,
  };
}