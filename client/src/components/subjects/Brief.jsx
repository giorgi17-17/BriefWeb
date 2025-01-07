import { useState, useEffect } from "react";
import { handleProcessBrief } from "../../utils/api";
import { supabase } from "../../utils/supabaseClient";
import PropTypes from "prop-types";

const Brief = ({ selectedFile, user, lectureId }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [selectedBrief, setSelectedBrief] = useState(null);
  const filePath = selectedFile?.path.split("/").pop();

  // console.log(selectedFile?.path.split("/").pop())
  useEffect(() => {
    const fetchBriefs = async () => {
      try {
        const { data, error: briefsError } = await supabase
          .from("briefs")
          .select("*")
          .eq("lecture_id", lectureId)
          .order("created_at", { ascending: false });

        if (briefsError) throw briefsError;
        setBriefs(data || []);
        if (data?.length > 0) {
          setSelectedBrief(data[0]); // Select the most recent brief
        }
      } catch (err) {
        console.error("Error fetching briefs:", err);
        setError(err.message);
      }
    };

    if (lectureId) {
      fetchBriefs();
    }
  }, [lectureId]);

  const handleGenerateBrief = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      if (!selectedFile) throw new Error("No file selected");

      // Get the file ID from the selected file
      const fileId = selectedFile.id;
      if (!fileId) throw new Error("Invalid file selected");
      console.log("fileeeeeeeeeee" + fileId);
      // Generate brief data from server
      const briefData = await handleProcessBrief(user.id, lectureId, filePath);

      if (!briefData) {
        throw new Error("No brief data received from server");
      }

      // Create brief in Supabase
      const { data: newBrief, error: insertError } = await supabase
        .from("briefs")
        .insert({
          lecture_id: lectureId,
          file_id: fileId,
          name: selectedFile.name,
          key_concepts: briefData.key_concepts,
          summary: briefData.summary,
          important_details: briefData.important_details,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setBriefs((prevBriefs) => [newBrief, ...prevBriefs]);
      setSelectedBrief(newBrief);
    } catch (err) {
      setError(err.message);
      console.error("Error generating brief:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBriefSelect = (brief) => {
    setSelectedBrief(brief);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* File Info Section */}
      {briefs.length > 1 && (
        <div className="mt-8 mb-8 pt-4">
          <h3 className="text-lg font-semibold mb-3">Your Briefs</h3>
          <div className="space flex gap-5">
            {briefs.map((brief) => (
              <button
                key={brief.id}
                onClick={() => handleBriefSelect(brief)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedBrief?.id === brief.id
                    ? "bg-blue-50 border-2 border-blue-500"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{brief.name}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(brief.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={handleGenerateBrief}
          disabled={isGenerating}
          className={`px-6 py-3 rounded-lg font-medium text-white 
            ${
              isGenerating
                ? "bg-[#EAEAEA] cursor-not-allowed"
                : "bg-[#4CAF93] hover:bg-[#3a8b74] transition-colors"
            }`}
        >
          {isGenerating ? "Generating..." : "Generate Brief"}
        </button>
        <div className="text-sm text-gray-500">
          AI will analyze your notes and create a comprehensive brief
        </div>
      </div>

      {/* Generated Brief Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#2C3E50] border-b border-[#EAEAEA] pb-2">
          Generated Brief
        </h2>

        {selectedBrief ? (
          <div className="space-y-6 text-[#2C3E50]">
            <section>
              <h3 className="text-xl font-semibold mb-3 text-[#4CAF93]">
                Key Concepts
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {selectedBrief.key_concepts.map((concept, index) => (
                  <li key={index}>{concept}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3 text-[#4CAF93]">
                Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {selectedBrief.summary}
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3 text-[#4CAF93]">
                Important Details
              </h3>
              <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#EAEAEA]">
                <ul className="space-y-3 text-gray-700">
                  {selectedBrief.important_details.map((detail, index) => (
                    <li key={index} className="flex items-start">
                      <span
                        className={`text-[${
                          index % 3 === 0
                            ? "#FFD166"
                            : index % 3 === 1
                            ? "#3A86FF"
                            : "#FF5D73"
                        }] mr-2`}
                      >
                        •
                      </span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            Generate a brief to see the content here
          </div>
        )}

        {/* Brief Selection */}
      </div>
    </div>
  );
};

Brief.propTypes = {
  selectedFile: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    path: PropTypes.string,
  }),
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default Brief;
