// IMPORTANT: Replace with your actual API key
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY;

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
  const answerChoiceElements = answerBlock.querySelectorAll('div.answer div[data-region="answer-label"] div.flex-fill.ml-1');

  answerChoiceElements.forEach(choiceElement => {
    answerOptions.push(choiceElement.textContent || choiceElement.innerText);
  });

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

    const prompt = `Based on the following question and multiple choice answers, which is the correct answer? Only return the text of the correct answer. If you cannot determine the answer, say "Unable to determine answer".

Question:
${questionText}

Possible Answers:
${answerOptions.map(opt => `- ${opt.trim()}`).join('\n')}
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
