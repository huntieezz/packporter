document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const downloadSection = document.getElementById('downloadSection');
    const downloadButton = document.getElementById('downloadButton');
    const steps = document.querySelectorAll('.step');
    
    let convertedFile = null; // To store the converted file blob
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    // Handle browse files
    dropArea.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileInputChange, false);
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    function highlight() {
      dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
      dropArea.classList.remove('highlight');
    }
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length) {
        uploadFile(files[0]);
      }
    }
    
    function handleFileInputChange(e) {
      if (e.target.files.length) {
        uploadFile(e.target.files[0]);
      }
    }
    
    async function uploadFile(file) {
      // Check if it's a zip file
      if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
        alert('Please upload a valid .zip file containing a Java texture pack.');
        return;
      }
      
      // Reset UI
      downloadSection.style.display = 'none';
      downloadSection.classList.remove('fade-in');
      convertedFile = null;
      
      // Show progress container
      progressContainer.style.display = 'block';
      
      try {
        // Update steps - Step 1: File received
        updateStep(0);
        progressBar.style.width = '10%';
        progressText.textContent = 'File received...';
        
        // Step 2: Analyzing
        setTimeout(async () => {
          updateStep(1);
          progressBar.style.width = '25%';
          progressText.textContent = 'Analyzing texture pack...';
          
          // Validate that this is actually a Java texture pack
          const isValidTexturePack = await validateJavaTexturePack(file);
          
          if (!isValidTexturePack) {
            throw new Error('Invalid Java texture pack. Please upload a valid Java texture pack.');
          }
          
          // Step 3: Converting - Actually call the conversion function
          setTimeout(async () => {
            updateStep(2);
            progressBar.style.width = '50%';
            progressText.textContent = 'Converting textures to Bedrock format...';
            
            try {
              // Actually call the conversion function
              convertedFile = await convertTexturePack(file);
              
              // Step 4: Customizing
              updateStep(3);
              progressBar.style.width = '75%';
              progressText.textContent = 'Adding attribution: Ported by huntiez MC Pack Converter';
              
              // Add a small delay to show the customization step
              setTimeout(() => {
                // Step 5: Ready for download
                updateStep(4);
                progressBar.style.width = '100%';
                progressText.textContent = 'Processing complete!';
                
                // Show download section
                setTimeout(() => {
                  downloadSection.style.display = 'block';
                  downloadSection.classList.add('fade-in');
                }, 800);
              }, 1500);
              
            } catch (error) {
              console.error('Conversion failed:', error);
              progressText.textContent = 'Conversion failed: ' + error.message;
              progressBar.style.backgroundColor = '#ff3333';
            }
          }, 1500);
        }, 500);
        
      } catch (error) {
        console.error('Error during file processing:', error);
        progressText.textContent = 'Error: ' + error.message;
        progressBar.style.backgroundColor = '#ff3333';
      }
    }
    
    function updateStep(stepIndex) {
      steps.forEach((step, index) => {
        if (index < stepIndex) {
          step.classList.remove('active');
          step.classList.add('completed');
        } else if (index === stepIndex) {
          step.classList.add('active');
          step.classList.remove('completed');
        } else {
          step.classList.remove('active');
          step.classList.remove('completed');
        }
      });
    }
    
    // Validate that the uploaded file is actually a Java texture pack
    async function validateJavaTexturePack(file) {
      return new Promise(async (resolve) => {
        try {
          const JSZip = window.JSZip;
          if (!JSZip) {
            console.error('JSZip library not found. Please include JSZip in your project.');
            resolve(false);
            return;
          }
          
          const zip = await JSZip.loadAsync(file);
          
          // Check for key files that indicate it's a Java texture pack
          // A valid Java texture pack should have at least one of these:
          const hasPackMcmeta = zip.file('pack.mcmeta') !== null;
          const hasAssetsFolder = Object.keys(zip.files).some(path => path.startsWith('assets/'));
          
          // Check for at least one texture file
          const hasTextures = Object.keys(zip.files).some(path => {
            return path.includes('/textures/') && (
              path.endsWith('.png') || path.endsWith('.tga')
            );
          });
          
          const isValid = (hasPackMcmeta || hasAssetsFolder) && hasTextures;
          console.log('Texture pack validation result:', isValid);
          resolve(isValid);
        } catch (error) {
          console.error('Error validating texture pack:', error);
          resolve(false);
        }
      });
    }
    
    // Actually convert the texture pack
    async function convertTexturePack(file) {
      return new Promise(async (resolve, reject) => {
        try {
          console.log('Starting conversion of:', file.name);
          
          const JSZip = window.JSZip;
          if (!JSZip) {
            reject(new Error('JSZip library not found. Please include JSZip in your project.'));
            return;
          }
          
          // Load the original zip file
          const originalZip = await JSZip.loadAsync(file);
          const newZip = new JSZip();
          
          // Create Bedrock pack manifest
          const uuid1 = generateUUID();
          const uuid2 = generateUUID();
          const packName = file.name.replace('.zip', '');
          
          // Create manifest.json - required for Bedrock texture packs
          const manifest = {
            format_version: 2,
            header: {
              name: packName,
              description: "Ported by huntiez MC Pack Converter",
              uuid: uuid1,
              version: [1, 0, 0],
              min_engine_version: [1, 16, 0]
            },
            modules: [
              {
                type: "resources",
                uuid: uuid2,
                version: [1, 0, 0]
              }
            ]
          };
          
          // Add manifest to the new zip
          newZip.file('manifest.json', JSON.stringify(manifest, null, 2));
          
          // Add an icon (optional but recommended)
          // You could extract an icon from the original pack or use a default one
          if (originalZip.file('pack.png')) {
            const iconData = await originalZip.file('pack.png').async('blob');
            newZip.file('pack_icon.png', iconData);
          }
          
          // Convert Java textures to Bedrock format
          // This is a simplified conversion - a real converter would need more mapping logic
          
          // Process all files from the original zip
          const processedFiles = [];
          
          for (const path in originalZip.files) {
            if (!originalZip.files[path].dir) {
              let newPath = path;
              const fileData = await originalZip.file(path).async('blob');
              
              // Map Java paths to Bedrock paths
              if (path.startsWith('assets/minecraft/')) {
                newPath = path.replace('assets/minecraft/', '');
              }
              
              // Map specific directories
              if (newPath.includes('/textures/blocks/')) {
                newPath = newPath.replace('/textures/blocks/', '/textures/blocks/');
              } else if (newPath.includes('/textures/items/')) {
                newPath = newPath.replace('/textures/items/', '/textures/items/');
              } else if (newPath.includes('/textures/entity/')) {
                newPath = newPath.replace('/textures/entity/', '/textures/entity/');
              }
              
              // Skip metadata files specific to Java
              if (path === 'pack.mcmeta') continue;
              
              newZip.file(newPath, fileData);
              processedFiles.push({original: path, converted: newPath});
            }
          }
          
          console.log('Files processed:', processedFiles);
          
          // Generate the .mcpack file
          const mcpackBlob = await newZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE'
          });
          
          const convertedFileName = file.name.replace('.zip', '.mcpack');
          const convertedFile = new File([mcpackBlob], convertedFileName, {
            type: 'application/octet-stream'
          });
          
          console.log('Conversion completed:', convertedFile);
          resolve(convertedFile);
        } catch (error) {
          console.error('Error in conversion:', error);
          reject(new Error('Texture pack conversion failed: ' + error.message));
        }
      });
    }
    
    // Generate a random UUID (v4)
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    // Download button event
    downloadButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      if (convertedFile) {
        console.log('Downloading converted file:', convertedFile);
        
        // Create a download link for the converted file
        const downloadUrl = URL.createObjectURL(convertedFile);
        const tempLink = document.createElement('a');
        tempLink.href = downloadUrl;
        tempLink.download = convertedFile.name;
        
        // Append to the document, click it, and then remove it
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        
        // Clean up the URL object
        setTimeout(() => {
          URL.revokeObjectURL(downloadUrl);
        }, 100);
      } else {
        alert('No converted file available. Please try converting again.');
      }
    });
});