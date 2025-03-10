document.addEventListener('DOMContentLoaded', function() {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const downloadSection = document.getElementById('downloadSection');
  const downloadButton = document.getElementById('downloadButton');
  const steps = document.querySelectorAll('.step');
  
  let convertedFile = null;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  dropArea.addEventListener('drop', handleDrop, false);
  
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
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      alert('Please upload a valid .zip file containing a Java texture pack.');
      return;
    }
    
    downloadSection.style.display = 'none';
    downloadSection.classList.remove('fade-in');
    convertedFile = null;
    
    progressContainer.style.display = 'block';
    progressBar.style.backgroundColor = '#4CAF50';
    
    try {
      updateStep(0);
      progressBar.style.width = '10%';
      progressText.textContent = 'File received...';
      
      setTimeout(async () => {
        updateStep(1);
        progressBar.style.width = '25%';
        progressText.textContent = 'Analyzing texture pack...';
        
        const validationResult = await validateJavaTexturePack(file);
        
        if (!validationResult.isValid) {
          progressBar.style.backgroundColor = '#ff3333';
          progressText.textContent = 'Error: ' + validationResult.error;
          throw new Error(validationResult.error);
        }
        
        setTimeout(async () => {
          updateStep(2);
          progressBar.style.width = '50%';
          progressText.textContent = 'Converting textures to Bedrock format...';
          
          try {
            convertedFile = await convertTexturePack(file, validationResult.fileList);
            
            updateStep(3);
            progressBar.style.width = '75%';
            progressText.textContent = 'Adding attribution: Ported by huntiez MC Pack Converter';
            
            setTimeout(() => {
              updateStep(4);
              progressBar.style.width = '100%';
              progressText.textContent = 'Processing complete!';
              
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
  
  async function validateJavaTexturePack(file) {
    return new Promise(async (resolve) => {
      try {
        if (typeof JSZip === 'undefined') {
          resolve({
            isValid: false, 
            error: 'JSZip library not loaded. Please check your internet connection.'
          });
          return;
        }
        
        const zip = await JSZip.loadAsync(file);
        const fileList = Object.keys(zip.files);
        
        if (fileList.length === 0) {
          resolve({
            isValid: false,
            error: 'The ZIP file is empty or corrupted.'
          });
          return;
        }
        
        const hasPackMcmeta = zip.file('pack.mcmeta') !== null;
        
        const hasAssetsMinecraftFolder = fileList.some(path => 
          path.startsWith('assets/minecraft/') || 
          path === 'assets/minecraft/'
        );
        
        const hasTextureFiles = fileList.some(path => 
          (path.includes('/textures/') || path.includes('/texture/')) && 
          (path.endsWith('.png') || path.endsWith('.tga'))
        );
        
        const hasBlockTextures = fileList.some(path => 
          (path.includes('/textures/block/') || path.includes('/textures/blocks/')) && 
          (path.endsWith('.png') || path.endsWith('.tga'))
        );
        
        const hasCommonFolders = 
          fileList.some(path => path.includes('/textures/')) || 
          fileList.some(path => path.includes('/models/')) || 
          fileList.some(path => path.includes('/blockstates/'));
        
        const structureValid = hasPackMcmeta || hasAssetsMinecraftFolder || hasCommonFolders;
        const contentValid = hasTextureFiles || hasBlockTextures;
        
        if (!structureValid) {
          resolve({
            isValid: false,
            error: 'Invalid texture pack: Missing pack.mcmeta or proper assets folder structure.'
          });
          return;
        }
        
        if (!contentValid) {
          resolve({
            isValid: false,
            error: 'Invalid texture pack: No texture files found.'
          });
          return;
        }
        
        resolve({
          isValid: true,
          fileList: fileList
        });
      } catch (error) {
        resolve({
          isValid: false,
          error: 'Failed to analyze ZIP file: ' + error.message
        });
      }
    });
  }
  
  async function convertTexturePack(file, fileList) {
    return new Promise(async (resolve, reject) => {
      try {
        if (typeof JSZip === 'undefined') {
          reject(new Error('JSZip library not loaded. Please check your internet connection.'));
          return;
        }
        
        const originalZip = await JSZip.loadAsync(file);
        const newZip = new JSZip();
        
        const uuid1 = generateUUID();
        const uuid2 = generateUUID();
        const packName = file.name.replace('.zip', '');
        
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
        
        newZip.file('manifest.json', JSON.stringify(manifest, null, 2));
        
        if (originalZip.file('pack.png')) {
          const iconData = await originalZip.file('pack.png').async('blob');
          newZip.file('pack_icon.png', iconData);
        }
        
        const processedFiles = [];
        let fileCounter = 0;
        
        for (const path of fileList) {
          if (!originalZip.files[path].dir) {
            let newPath = path;
            const fileData = await originalZip.file(path).async('blob');
            
            if (path.startsWith('assets/minecraft/')) {
              newPath = path.replace('assets/minecraft/', '');
            }
            
            if (newPath.includes('/textures/blocks/')) {
              newPath = newPath.replace('/textures/blocks/', '/textures/blocks/');
            } else if (newPath.includes('/textures/items/')) {
              newPath = newPath.replace('/textures/items/', '/textures/items/');
            } else if (newPath.includes('/textures/entity/')) {
              newPath = newPath.replace('/textures/entity/', '/textures/entity/');
            } else if (newPath.includes('/textures/block/')) {
              newPath = newPath.replace('/textures/block/', '/textures/blocks/');
            } else if (newPath.includes('/textures/item/')) {
              newPath = newPath.replace('/textures/item/', '/textures/items/');
            }
            
            if (path === 'pack.mcmeta') continue;
            
            newZip.file(newPath, fileData);
            processedFiles.push({original: path, converted: newPath});
            fileCounter++;
          }
        }
        
        if (fileCounter === 0) {
          reject(new Error('No valid texture files were found to convert.'));
          return;
        }
        
        const mcpackBlob = await newZip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE'
        });
        
        const convertedFileName = file.name.replace('.zip', '.mcpack');
        const convertedFile = new File([mcpackBlob], convertedFileName, {
          type: 'application/octet-stream'
        });
        
        resolve(convertedFile);
      } catch (error) {
        reject(new Error('Texture pack conversion failed: ' + error.message));
      }
    });
  }
  
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  downloadButton.addEventListener('click', function(e) {
    e.preventDefault();
    
    if (convertedFile) {
      const downloadUrl = URL.createObjectURL(convertedFile);
      const tempLink = document.createElement('a');
      tempLink.href = downloadUrl;
      tempLink.download = convertedFile.name;
      
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 100);
    } else {
      alert('No converted file available. Please try converting again.');
    }
  });
});