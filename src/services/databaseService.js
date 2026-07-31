import { supabase } from '../supabaseClient';

export const databaseService = {
  
  async getRecordings() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error:', authError);
        return [];
      }
      
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recordings:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('getRecordings error:', err);
      return [];
    }
  },

  async uploadAudio(audioBlob) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('You must be logged in to upload audio');
    }

    const fileName = `${user.id}_${Date.now()}.webm`;
    const filePath = `public/${fileName}`;

    const { data, error } = await supabase.storage
      .from('audio-recordings')
      .upload(filePath, audioBlob, { 
        contentType: 'audio/webm',
        cacheControl: '3600',
        upsert: false 
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error('Upload failed: ' + error.message);
    }

    const { data: urlData } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filePath);

    return { fileName, audioUrl: urlData.publicUrl };
  },

  async saveRecording(recordingData) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const insertData = {
      user_id: user.id,
      title: recordingData.title || 'Untitled Recording',
      audio_url: recordingData.audioUrl,
      file_name: recordingData.fileName,
      language: recordingData.language || 'Pending',
      speaker_count: recordingData.speakerCount || 0,
      transcription: recordingData.transcription || '',
      summary: recordingData.summary || '',
      action_items: recordingData.actionItems || [],
      key_topics: recordingData.keyTopics || [],
      notes: recordingData.notes || '',
      duration: recordingData.duration || 0
    };

    console.log('Inserting into DB:', insertData);

    const { data, error } = await supabase
      .from('recordings')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      throw new Error('Save failed: ' + error.message);
    }

    console.log('Recording saved successfully:', data);
    return data;
  },

  async updateRecording(id, updates) {
    const updateData = { ...updates, updated_at: new Date().toISOString() };
    
    const { data, error } = await supabase
      .from('recordings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw error;
    }
    return data;
  },

  async deleteRecording(id, fileName) {
    if (fileName) {
      await supabase.storage
        .from('audio-recordings')
        .remove([`public/${fileName}`]);
    }
    
    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
    return true;
  },

  async getNotes() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Notes fetch error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('getNotes error:', err);
      return [];
    }
  },

  async createNote(content) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, content })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateNote(id, content) {
    const { data, error } = await supabase
      .from('notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteNote(id) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};