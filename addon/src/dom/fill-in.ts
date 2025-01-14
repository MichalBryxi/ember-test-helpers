import getElement from './-get-element.ts';
import isFormControl, { type FormControl } from './-is-form-control.ts';
import guardForMaxlength from './-guard-for-maxlength.ts';
import { __focus__ } from './focus.ts';
import settled from '../settled.ts';
import fireEvent from './fire-event.ts';
import { isContentEditable, type Target } from './-target.ts';
import { log } from './-logging.ts';
import { runHooks, registerHook } from '../helper-hooks.ts';
import getDescription from './-get-description.ts';

registerHook('fillIn', 'start', (target: Target, text: string) => {
  log('fillIn', target, text);
});

/**
  Fill the provided text into the `value` property (or set `.innerHTML` when
  the target is a content editable element) then trigger `change` and `input`
  events on the specified target.

  @public
  @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to enter text into
  @param {string} text the text to fill into the target element
  @return {Promise<void>} resolves when the application is settled

  @example
  <caption>
    Emulating filling an input with text using `fillIn`
  </caption>

  fillIn('input', 'hello world');
*/
export default function fillIn(target: Target, text: string): Promise<void> {
  return Promise.resolve()
    .then(() => runHooks('fillIn', 'start', target, text))
    .then(() => {
      if (!target) {
        throw new Error(
          'Must pass an element, selector, or descriptor to `fillIn`.',
        );
      }

      const element = getElement(target) as Element | HTMLElement;
      if (!element) {
        const description = getDescription(target);
        throw new Error(
          `Element not found when calling \`fillIn('${description}')\`.`,
        );
      }

      if (typeof text === 'undefined' || text === null) {
        throw new Error('Must provide `text` when calling `fillIn`.');
      }

      if (isFormControl(element)) {
        if (element.disabled) {
          throw new Error(
            `Can not \`fillIn\` disabled '${getDescription(target)}'.`,
          );
        }

        if ('readOnly' in element && element.readOnly) {
          throw new Error(
            `Can not \`fillIn\` readonly '${getDescription(target)}'.`,
          );
        }

        guardForMaxlength(element, text, 'fillIn');

        return __focus__(element).then(() => {
          (element as FormControl).value = text;
          return element;
        });
      } else if (isContentEditable(element)) {
        return __focus__(element).then(() => {
          element.innerHTML = text;
          return element as Element;
        });
      } else {
        throw new Error(
          '`fillIn` is only usable on form controls or contenteditable elements.',
        );
      }
    })
    .then((element) =>
      fireEvent(element, 'input')
        .then(() => fireEvent(element, 'change'))
        .then(settled),
    )
    .then(() => runHooks('fillIn', 'end', target, text));
}
