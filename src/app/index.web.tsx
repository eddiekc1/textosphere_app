import { StatusBar } from 'expo-status-bar';
import { createElement } from 'react';

const TEXTOSPHERE_URL = 'https://www.textosphere.com/';

export default function HomeScreen() {
  return (
    <>
      <StatusBar style="dark" />
      {createElement(
        'div',
        {
          style: {
            backgroundColor: '#ffffff',
            height: '100vh',
            overflow: 'hidden',
            width: '100vw',
          },
        },
        createElement('iframe', {
          src: TEXTOSPHERE_URL,
          title: 'Textosphere',
          style: {
            border: 0,
            height: '100%',
            width: '100%',
          },
        })
      )}
    </>
  );
}
