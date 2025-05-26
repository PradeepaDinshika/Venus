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
  // choiceTextElements are divs with class 'flex-fill ml-1' containing the answer <p>
  const choiceTextElements = answerBlock.querySelectorAll('div.answer div[data-region="answer-label"] div.flex-fill.ml-1');

  choiceTextElements.forEach(choiceTextElement => {
    const fullText = choiceTextElement.textContent ? choiceTextElement.textContent.trim() : '';
    let letter = '';
    let inputElement = null;

    // Navigate to find the associated input element and answer number span
    try {
      const dataRegionLabelDiv = choiceTextElement.parentElement; // Should be div[data-region="answer-label"]
      if (dataRegionLabelDiv) {
        // Extract letter from span.answernumber
        const answerNumberSpan = dataRegionLabelDiv.querySelector('span.answernumber');
        if (answerNumberSpan && answerNumberSpan.textContent) {
          letter = answerNumberSpan.textContent.trim().replace(/\.\s*$/, '').toLowerCase(); // Remove trailing '.' and space, and lowercase
        } else {
          console.warn("Could not find span.answernumber or its content for an option.");
        }

        // Find input element (usually sibling of dataRegionLabelDiv, within a common parent .r0 or .r1)
        const choiceWrapperDiv = dataRegionLabelDiv.parentElement; // Should be div.r0 or div.r1
        if (choiceWrapperDiv) {
          inputElement = choiceWrapperDiv.querySelector('input[type="checkbox"], input[type="radio"]');
        } else {
          console.warn("Could not find choiceWrapperDiv (parent of dataRegionLabelDiv).");
        }
      } else {
        console.warn("Could not find dataRegionLabelDiv (parent of choiceTextElement).");
      }
    } catch (e) {
      console.error("Error navigating DOM to find input element or letter:", e);
    }

    if (letter && fullText && inputElement) {
      answerOptions.push({ letter: letter, text: fullText, inputElement: inputElement });
    } else {
      if (!letter) console.warn("Found an answer option without a letter for text:", fullText);
      if (!fullText) console.warn("Found an answer option without text for letter:", letter);
      if (!inputElement) console.warn("Found an answer option but could not find its input element for text:", fullText);
    }
  });

  // This log is useful for debugging the new structure
  console.log("Extracted Answer Options with Letters and Inputs:", answerOptions);

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

    const prompt = `You are an expert in analyzing questions and answers. Based on the question and the provided multiple choice options (including their letters and full text), identify the letter(s) corresponding to ALL correct answer(s).

Return *only the letter(s)* (e.g., a or b,d) of the correct answer(s).
If there are multiple correct answers, separate their letters with a single comma (e.g., b,d).
If none of the options are correct or if you cannot determine the answer from the information given, respond with the exact phrase 'Unable to determine answer'.

Question:
${questionText}

Possible Answers:
${answerOptions.map(opt => `- ${opt.letter}. ${opt.text.trim()}`).join('\n')}
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

        let individualAnswers = []; // This will now store letters, e.g., ['a', 'd']
        const unableToDeterminePattern = /unable to determine answer/i; // Case-insensitive check

        if (unableToDeterminePattern.test(AITextResponse)) {
          console.log("API was unable to determine the answer. No letters to process.");
        } else {
          // API is expected to return letters, possibly comma-separated (e.g., "a", "b,d", "a, d")
          individualAnswers = AITextResponse.split(',')
                                          .map(letter => letter.trim().toLowerCase())
                                          .filter(letter => letter.length > 0);
        }
        
        console.log('Processed Individual Correct Letters:', individualAnswers); // Updated log message

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
