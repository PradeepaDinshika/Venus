// IMPORTANT: Replace with your actual API key
const GEMINI_API_KEY = 'AIzaSyDmYY4TiI8Ck9nEjXGX_HnrAhGZmtSlwcE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + GEMINI_API_KEY;

// Find all question elements
const questionElements = document.querySelectorAll('div.qtext');

questionElements.forEach((questionElement, index) => { // Added index for unique IDs if needed, but class approach is simpler
  // Extract the question text
  const questionText = questionElement.textContent || questionElement.innerText;

  // Find the corresponding answer block
  let answerBlock = questionElement.nextElementSibling;
  while (answerBlock && !answerBlock.classList.contains('ablock')) {
    answerBlock = answerBlock.nextElementSibling;
  }

  if (!answerBlock) {
    console.warn("No answer block found for question:", questionText);
    return; // Skip this question if no answer block is found
  }

  // Extract answer options from the block
  const answerOptions = [];
  // The choiceTextElement is the div containing the P tag with the answer text.
  const choiceTextElements = answerBlock.querySelectorAll('div.answer div[data-region="answer-label"] div.flex-fill.ml-1');

  choiceTextElements.forEach(choiceTextElement => {
    const text = choiceTextElement.textContent ? choiceTextElement.textContent.trim() : '';

    // Navigate to find the associated input element.
    // Based on structure: choiceTextElement (div.flex-fill.ml-1)
    // -> parent is div[data-region="answer-label"]
    // -> parent of that is div.r0 or div.r1 (let's call it choiceWrapper)
    // -> input is a child of choiceWrapper
    let inputElement = null;
    try {
      const dataRegionLabelDiv = choiceTextElement.parentElement; // Should be div[data-region="answer-label"]
      if (dataRegionLabelDiv) {
        const choiceWrapperDiv = dataRegionLabelDiv.parentElement; // Should be div.r0 or div.r1
        if (choiceWrapperDiv) {
          inputElement = choiceWrapperDiv.querySelector('input[type="checkbox"], input[type="radio"]');
        }
      }
    } catch (e) {
      console.error("Error navigating DOM to find input element:", e);
    }

    if (text && inputElement) {
      answerOptions.push({ text: text, inputElement: inputElement });
    } else {
      if (!text) console.warn("Found an answer option without text.");
      if (!inputElement) console.warn("Found an answer option text but could not find its input element:", text);
    }
  });

  // This log is useful for debugging the new structure
  console.log("Extracted Answer Options with Inputs:", answerOptions);

  if (answerOptions.length === 0) {
    console.warn("No answer options found for question:", questionText);
  }

  // Create and insert a button
  const button = document.createElement('button');
  button.textContent = "Find Answer with Venus";
  button.style.backgroundColor = "lightblue";
  button.style.padding = "5px";
  button.style.marginTop = "5px";
  button.style.cursor = "pointer";
  // Assign a unique ID to the button to help associate it with its answer display if needed,
  // though the direct DOM traversal (button.nextElementSibling) is simpler for now.
  // button.id = `venus-button-${index}`;

  questionElement.parentNode.insertBefore(button, questionElement.nextSibling);

  // Add click event listener to the button
  button.addEventListener('click', async () => { // Make the handler async
    console.log("Question:", questionText);
    console.log("Answers:", answerOptions);

    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      console.warn('Please replace "YOUR_GEMINI_API_KEY" with your actual Gemini API key in content.js');
      alert('Please configure your Gemini API key in the extension code (content.js).');
      return;
    }

    const prompt = `You are an expert in analyzing questions and answers. Based on the following question and the provided multiple choice options, identify ALL correct answer(s). List each correct answer's full text exactly as provided in the options, each on a new line. If you believe no options are correct, or if the question is unanswerable from the given options, respond with 'Unable to determine answer'.

Question:
${questionText}

Possible Answers:
${answerOptions.map(opt => `- ${opt.text.trim()}`).join('\n')}
`;

    console.log("Prompt:", prompt);

    // Indicate loading state on the button (optional)
    button.textContent = "Finding Answer...";
    button.disabled = true;

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API request failed:', response.status, response.statusText, errorBody);
        alert(`API request failed: ${response.status} ${response.statusText}. Check console for details and full error body.`);
        // Reset button text
        button.textContent = "Find Answer with Venus";
        button.disabled = false;
        return;
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Reset button text
      button.textContent = "Find Answer with Venus";
      button.disabled = false;

      if (data.candidates && data.candidates.length > 0 &&
          data.candidates[0].content && data.candidates[0].content.parts &&
          data.candidates[0].content.parts.length > 0) {
        
        const AITextResponse = data.candidates[0].content.parts[0].text;
        console.log('Gemini Answer:', AITextResponse);

        let individualAnswers = [];
        const unableToDeterminePattern = /unable to determine answer/i; // Case-insensitive check

        if (unableToDeterminePattern.test(AITextResponse)) {
          // If the API says it's unable to determine, treat it as a single piece of info.
          // The existing display logic will show this message.
          // For marking inputs, we'll have an empty array of actual answers.
          console.log("API was unable to determine the answer.");
        } else {
          // Split by newline and trim each potential answer
          individualAnswers = AITextResponse.split('\n').map(answer => answer.trim()).filter(answer => answer.length > 0);
        }
        
        console.log('Processed Individual Answers:', individualAnswers); 
        // This `individualAnswers` array will be used in the next step for matching and marking.

        // --- START LOGIC FOR MARKING INPUTS ---

        // Clear any previous highlights from this extension for this question's options
        answerOptions.forEach(option => {
          // Check if parentElement exists before trying to access its classList
          if (option.inputElement.parentElement) {
            option.inputElement.parentElement.classList.remove('venus-highlighted-answer');
          }
          // If we wanted to uncheck boxes previously checked by this extension, 
          // we'd need a way to identify them (e.g., another class).
          // For now, we are not unchecking previously checked user or extension selections.
        });

        if (individualAnswers.length > 0) {
          individualAnswers.forEach(apiAnswerText => {
            const trimmedApiAnswerText = apiAnswerText.trim().toLowerCase(); // Normalize API answer
            if (trimmedApiAnswerText === "") return; // Skip empty strings if any survived filter

            answerOptions.forEach(option => {
              const trimmedOptionText = option.text.trim().toLowerCase(); // Normalize option text

              // Attempt to match. For more robustness, one might consider partial matches
              // or string similarity, but for now, we'll use exact match of normalized text.
              // The prompt asks Gemini for "exact full text".
              if (trimmedOptionText === trimmedApiAnswerText) {
                option.inputElement.checked = true;
                // Optionally, highlight the parent of the input (e.g., the div.r0 or div.r1)
                if (option.inputElement.parentElement) {
                   option.inputElement.parentElement.classList.add('venus-highlighted-answer');
                }
                console.log(`Matched and checked: "${option.text}"`);
              }
            });
          });
        }
        // --- END LOGIC FOR MARKING INPUTS ---

        // --- START MODIFICATION to display answer ---

        // Check for and remove an existing answer display for this button
        const existingAnswerDisplay = button.nextElementSibling;
        if (existingAnswerDisplay && existingAnswerDisplay.classList.contains('venus-answer-display')) {
          existingAnswerDisplay.remove();
        }

        // Create and display the new answer
        const answerDisplayDiv = document.createElement('div');
        answerDisplayDiv.classList.add('venus-answer-display'); // Add class for identification/styling
        answerDisplayDiv.textContent = AITextResponse; // This will display "Unable to determine answer" if that's what the API returns
        answerDisplayDiv.style.marginTop = '10px';
        answerDisplayDiv.style.padding = '10px';
        answerDisplayDiv.style.border = '1px solid green';
        answerDisplayDiv.style.backgroundColor = '#e6ffe6'; // Light green background
        answerDisplayDiv.style.whiteSpace = 'pre-line'; // Added to render newlines

        // Insert the answer display div after the button
        button.parentNode.insertBefore(answerDisplayDiv, button.nextSibling);

        // --- END MODIFICATION ---

      } else {
        console.warn('No answer text found in API response or response structure is unexpected.');
        let feedbackMessage = 'Gemini API returned a response, but it did not contain the expected answer data.';
        if (data.promptFeedback) {
          console.warn('Prompt Feedback:', data.promptFeedback);
          if (data.promptFeedback.blockReason) {
            feedbackMessage += ` Reason: ${data.promptFeedback.blockReason}.`;
          }
          if (data.promptFeedback.safetyRatings) {
            feedbackMessage += ` Safety Ratings: ${JSON.stringify(data.promptFeedback.safetyRatings)}.`;
          }
        }
        alert(feedbackMessage + ' Check console for full details.');
      }

    } catch (error) {
      console.error('Error during API call:', error);
      alert('An error occurred while contacting the Gemini API. Check the console for details.');
      // Reset button text in case of error
      button.textContent = "Find Answer with Venus";
      button.disabled = false;
    }
  });
});

console.log("Venus content script loaded and updated to display API answers.");
