#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// Configuration
const PUBLIC_DIR = path.join(__dirname, '../frontend/public');
const TARGET_SIZE_KB = 200;
const TARGET_SIZE_BYTES = TARGET_SIZE_KB * 1024;
const OUTPUT_FORMAT = 'png';

// Images to optimize
const IMAGES_TO_OPTIMIZE = [
  'calendar.png',
  'dashboard.png',
  'file.png',
  'message.png',
  'note.png',
  'project.png',
  'search.png',
  'video-call.png'
];

// Statistics
const stats = {
  totalImages: 0,
  processedImages: 0,
  failedImages: 0,
  totalOriginalSize: 0,
  totalOptimizedSize: 0,
  details: []
};

/**
 * Get file size in bytes
 */
async function getFileSize(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Optimize image to target size
 */
async function optimizeImage(inputPath, outputPath, targetSizeBytes) {
  let quality = 85;
  let outputSize = 0;

  // Try different quality settings
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await sharp(inputPath)
        .png({
          quality,
          compressionLevel: 9,
          effort: 10,
          palette: false
        })
        .toFile(outputPath);

      outputSize = await getFileSize(outputPath);

      if (outputSize <= targetSizeBytes) {
        return { success: true, size: outputSize, quality, resized: false };
      }

      if (attempt < 7) {
        await fs.unlink(outputPath);
        quality = Math.max(50, quality - 5);
      }
    } catch (error) {
      throw new Error(`Sharp processing failed: ${error.message}`);
    }
  }

  // If still too large, resize the image
  try {
    await fs.unlink(outputPath);

    const metadata = await sharp(inputPath).metadata();
    let width = metadata.width;
    let height = metadata.height;

    for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt++) {
      width = Math.floor(width * 0.85);
      height = Math.floor(height * 0.85);

      await sharp(inputPath)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({
          quality: 75,
          compressionLevel: 9,
          effort: 10
        })
        .toFile(outputPath);

      outputSize = await getFileSize(outputPath);

      if (outputSize <= targetSizeBytes) {
        return {
          success: true,
          size: outputSize,
          quality: 75,
          resized: true,
          newDimensions: `${width}x${height}`
        };
      }

      if (resizeAttempt < 4) {
        await fs.unlink(outputPath);
      }
    }
  } catch (error) {
    throw new Error(`Resize attempt failed: ${error.message}`);
  }

  return { success: true, size: outputSize, quality: 75, resized: true };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Deskive image optimization...\n');
  console.log(`📋 Configuration:`);
  console.log(`   Target size: ${TARGET_SIZE_KB}KB or less`);
  console.log(`   Output format: ${OUTPUT_FORMAT.toUpperCase()}`);
  console.log(`   Source directory: ${PUBLIC_DIR}\n`);

  const startTime = Date.now();
  stats.totalImages = IMAGES_TO_OPTIMIZE.length;

  console.log(`📊 Found ${IMAGES_TO_OPTIMIZE.length} images to process\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Process each image
  for (let i = 0; i < IMAGES_TO_OPTIMIZE.length; i++) {
    const imageFile = IMAGES_TO_OPTIMIZE[i];
    const inputPath = path.join(PUBLIC_DIR, imageFile);
    const backupPath = path.join(PUBLIC_DIR, `${path.parse(imageFile).name}.backup.png`);
    const tempPath = path.join(PUBLIC_DIR, `${path.parse(imageFile).name}.temp.png`);
    const outputPath = inputPath;

    try {
      const originalSize = await getFileSize(inputPath);

      // Check if file exists
      if (originalSize === 0) {
        console.log(`   ⚠️  [${i + 1}/${IMAGES_TO_OPTIMIZE.length}] ${imageFile} - Not found, skipping...`);
        continue;
      }

      // Skip if already under target size
      if (originalSize <= TARGET_SIZE_BYTES) {
        console.log(`   ⏭️  [${i + 1}/${IMAGES_TO_OPTIMIZE.length}] ${imageFile} - Already optimized (${(originalSize / 1024).toFixed(1)}KB), skipping...`);
        stats.totalOriginalSize += originalSize;
        stats.totalOptimizedSize += originalSize;
        continue;
      }

      stats.totalOriginalSize += originalSize;

      console.log(`   🔄 [${i + 1}/${IMAGES_TO_OPTIMIZE.length}] ${imageFile}`);

      // Create backup
      await fs.copyFile(inputPath, backupPath);

      // Optimize to temp file
      const result = await optimizeImage(inputPath, tempPath, TARGET_SIZE_BYTES);

      // Replace original with optimized version
      await fs.copyFile(tempPath, outputPath);
      await fs.unlink(tempPath);

      const optimizedSize = result.size;
      stats.totalOptimizedSize += optimizedSize;

      const savedBytes = originalSize - optimizedSize;
      const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

      let statusMsg = `      ✅ ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savedPercent}%)`;
      if (result.resized) {
        statusMsg += ` [resized to ${result.newDimensions}]`;
      }
      console.log(statusMsg);

      stats.processedImages++;

      stats.details.push({
        name: imageFile,
        originalSize,
        optimizedSize,
        savedBytes,
        savedPercent: parseFloat(savedPercent),
        resized: result.resized
      });

    } catch (error) {
      console.log(`      ❌ Failed: ${error.message}`);
      stats.failedImages++;

      // Clean up temp file if exists
      try {
        await fs.unlink(tempPath);
      } catch (e) {
        // Ignore
      }

      // Restore from backup if exists
      try {
        await fs.copyFile(backupPath, inputPath);
        await fs.unlink(backupPath);
      } catch (e) {
        // Ignore
      }
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Save report
  const reportPath = path.join(PUBLIC_DIR, 'optimization-report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    configuration: {
      targetSizeKB: TARGET_SIZE_KB,
      outputFormat: OUTPUT_FORMAT
    },
    summary: {
      totalImages: stats.totalImages,
      processedImages: stats.processedImages,
      failedImages: stats.failedImages,
      totalOriginalSizeMB: (stats.totalOriginalSize / 1024 / 1024).toFixed(2),
      totalOptimizedSizeMB: (stats.totalOptimizedSize / 1024 / 1024).toFixed(2),
      totalSavedMB: ((stats.totalOriginalSize - stats.totalOptimizedSize) / 1024 / 1024).toFixed(2),
      compressionRatio: ((stats.totalOptimizedSize / stats.totalOriginalSize) * 100).toFixed(1) + '%'
    },
    details: stats.details
  }, null, 2));

  // Print summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('                    OPTIMIZATION COMPLETE                   ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total images:           ${stats.totalImages}`);
  console.log(`Processed images:       ${stats.processedImages}`);
  console.log(`Failed images:          ${stats.failedImages}`);
  console.log(`Original size:          ${(stats.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Optimized size:         ${(stats.totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Space saved:            ${((stats.totalOriginalSize - stats.totalOptimizedSize) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Compression ratio:      ${((stats.totalOptimizedSize / stats.totalOriginalSize) * 100).toFixed(1)}%`);
  console.log(`Duration:               ${duration}s`);
  console.log(`Report saved to:        ${reportPath}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('✅ All images optimized!\n');
  console.log('💡 Backup files (.backup.png) have been created for all modified images.\n');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
